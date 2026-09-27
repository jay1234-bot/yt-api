const axios = require('axios');

class ProxyManager {
  constructor() {
    this.proxies = [];
    this.currentIndex = 0;
    this.lastRefresh = 0;
    this.refreshInterval = 30 * 60 * 1000; // Refresh every 30 minutes
    this.workingProxies = new Set();
  }

  async fetchFreeProxies() {
    try {
      console.log('🔄 Fetching fresh proxy list...');
      const sources = [
        {
          url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=all&format=textplain',
          parse: (data) => data.split('\n').filter(p => p.trim() && p.includes(':'))
        },
        {
          url: 'https://www.proxy-list.download/api/v1/get?type=http',
          parse: (data) => data.split('<tr><td>').slice(1).map(row => row.split('</td>')[0] + ':' + row.split('</td>')[1]).filter(p => p)
        }
      ];

      for (const source of sources) {
        try {
          const response = await axios.get(source.url, { timeout: 10000 });
          const parsed = source.parse(response.data);
          if (parsed.length > 0) {
            this.proxies = parsed.slice(0, 100); // Keep top 100 proxies
            console.log(`✅ Loaded ${this.proxies.length} proxies from ${source.url.split('/')[2]}`);
            return;
          }
        } catch (e) {
          console.warn(`⚠️ Failed to fetch from ${source.url.split('/')[2]}:`, e.message);
        }
      }

      // Fallback: Use public proxy list
      if (this.proxies.length === 0) {
        this.proxies = [
          '1.10.189.95:30000',
          '24.199.80.76:8080',
          '197.211.192.225:3128',
          '41.215.6.14:8080'
        ];
        console.log('⚠️ Using fallback proxies');
      }
    } catch (error) {
      console.error('❌ Error fetching proxies:', error.message);
      if (this.proxies.length === 0) {
        this.proxies = ['127.0.0.1:3128']; // Last resort: localhost
      }
    }
  }

  getNext() {
    if (this.proxies.length === 0) return null;
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }

  async shouldRefresh() {
    return Date.now() - this.lastRefresh > this.refreshInterval;
  }

  async refreshIfNeeded() {
    if (await this.shouldRefresh()) {
      await this.fetchFreeProxies();
      this.lastRefresh = Date.now();
    }
  }

  markWorking(proxy) {
    this.workingProxies.add(proxy);
  }

  markBroken(proxy) {
    this.workingProxies.delete(proxy);
    const index = this.proxies.indexOf(proxy);
    if (index > -1) {
      this.proxies.splice(index, 1);
    }
  }

  getStats() {
    return {
      totalProxies: this.proxies.length,
      workingProxies: this.workingProxies.size,
      currentIndex: this.currentIndex,
      lastRefresh: new Date(this.lastRefresh).toISOString()
    };
  }
}

module.exports = new ProxyManager();
