export class Roaster {
  // Config
  userId = $state('');
  type = $state('book');

  // State
  status = $state<'idle' | 'scanning' | 'analyzing' | 'success' | 'error'>('idle');
  errorMsg = $state('');
  result = $state<any>(null);

  // Scan Logic State
  scannedCount = $state(0);
  currentItem = $state<any>(null);
  totalItems = $state(0);
  
  // Log State
  systemLogs = $state<{id: number; text: string; speed?: number}[]>([]);
  private logCounter = 0;
  private analysisMap = new Map<string, string>();
  
  // Internal Reference
  private ingestionInterval: any;

  constructor() {}

  reset() {
    this.status = 'scanning';
    this.errorMsg = '';
    this.scannedCount = 0;
    this.currentItem = null;
    this.logCounter = 0;
    this.systemLogs = [{id: this.logCounter++, text: '正在建立精神连接...'}];
    this.analysisMap.clear();
    this.result = null;
  }

  addLog(text: string, speed?: number) {
     this.systemLogs = [...this.systemLogs, {id: this.logCounter++, text, speed}];
     // Keep log size manageable during fast ingestion
     if (this.status === 'scanning' && this.systemLogs.length > 50) {
        this.systemLogs = this.systemLogs.slice(1);
     }
  }

  async start(apiKeys: { google?: string; deepseek?: string; qwen?: string } = {}) {
    if (!this.userId) {
      this.errorMsg = '请输入豆瓣ID';
      return;
    }

    this.reset();

    try {
      // 1. Fetch Data
      this.addLog('正在获取公开数据...');
      
      const fetchRes = await fetch('/api/fetch-douban', {
        method: 'POST',
        body: JSON.stringify({userId: this.userId, type: this.type}),
        headers: {'Content-Type': 'application/json'},
      });

      if (!fetchRes.ok) {
        const errData = await fetchRes.json();
        throw new Error(errData.message || '获取数据失败，请检查ID或网络');
      }
      const doubanData = await fetchRes.json();

      if (doubanData.count === 0) {
        throw new Error('未找到公开记录，请检查隐私设置');
      }

      // Filter
      const itemsToScan = doubanData.interests.filter((i: any) => (i.tags && i.tags.length > 0) || i.rating || i.comment);
      this.totalItems = itemsToScan.length;

      if (this.totalItems < 5) {
         throw new Error(
          `数据量不足，再多${this.type === 'book' ? '读几本书' : this.type === 'movie' ? '看几部电影' : '听几张专辑'}吧`,
        );
      }

      this.addLog(`访问许可确认. 锁定 ${this.totalItems} 条有效记录.`);

      // 2. Start AI Roast
      this.addLog('正在连接 Gemini 2.5 侧写模型...');
      this.addLog('开始深度模式识别...');

      // --- Ingestion Visualization ---
      this.startIngestionVisualization(doubanData.interests);

      // Call API
      const roastRes = await fetch('/api/roast', {
        method: 'POST',
        body: JSON.stringify({
          interests: itemsToScan.map((i: any) => ({
            title: i.title,
            rating: i.rating,
            tags: i.tags,
            comment: i.comment,
            create_time: i.create_time,
            year: i.year,
          })),
          apiKeys: {
            google: apiKeys.google || undefined,
            deepseek: apiKeys.deepseek || undefined,
            qwen: apiKeys.qwen || undefined
          }
        }),
        headers: {'Content-Type': 'application/json'},
      });

      // Stop ingestion
      this.stopIngestionVisualization();
      this.scannedCount = 0;

      if (!roastRes.ok) {
        let errorMessage = 'AI 分析失败';
        try {
          const errData = await roastRes.json();
          if (errData.message) errorMessage = errData.message;
        } catch (e) { }
        throw new Error(errorMessage);
      }

      const roastData = await roastRes.json();
      this.processRoastData(itemsToScan, roastData);

      // Store result
      this.result = roastData;

      // 3. Play Scanning Animation
      await this.playScanningAnimation(itemsToScan);

      this.status = 'analyzing';
      this.addLog('正在生成最终诊断报告...');
      
      await new Promise((r) => setTimeout(r, 800));
      this.status = 'success';

    } catch (err: any) {
      this.stopIngestionVisualization();
      this.status = 'error';
      this.errorMsg = err.message || '未知错误';
      console.error(err);
    }
  }

  private startIngestionVisualization(items: any[]) {
      const ingestionSpeed = 120;
      let ingestionIndex = 0;
      
      this.ingestionInterval = setInterval(() => {
        if (ingestionIndex >= items.length) ingestionIndex = 0;
        const item = items[ingestionIndex];
        this.currentItem = item;

        // Randomly add rapid technical logs
        if (Math.random() > 0.5) {
          const date = item.create_time?.slice(0, 10) || '未知日期';
          const rate = item.rating ? `${item.rating}星` : '';
          const tags = item.tags && item.tags.length > 0 ? `[${item.tags[0]}]` : '';

          const logText = `[读取] ${date} ${item.title.slice(0, 12)}... ${rate} ${tags}`;
          // Manually add log to avoid simple addLog slicing logic being too aggressive if I want different behavior here,
          // but addLog handles slicing nicely.
          this.addLog(logText);
           // Special handling for fast logs: keep list short
           if (this.systemLogs.length > 15) {
             this.systemLogs = this.systemLogs.slice(this.systemLogs.length - 15);
           }
        }
        ingestionIndex++;
      }, ingestionSpeed);
  }

  private stopIngestionVisualization() {
    if (this.ingestionInterval) {
      clearInterval(this.ingestionInterval);
      this.ingestionInterval = null;
    }
  }

  private processRoastData(itemsToScan: any[], roastData: any) {
      if (roastData.item_analysis) {
        const commentMap = new Map();
        itemsToScan.forEach((i: any) => {
          if (i.comment) commentMap.set(i.title, i.comment);
        });

        roastData.item_analysis.forEach((analysis: any) => {
          this.analysisMap.set(analysis.title, analysis.thought);
          if (commentMap.has(analysis.title)) {
            analysis.user_comment = commentMap.get(analysis.title);
          }
        });
        this.addLog('侧写向量已同步. 开始回放分析.');
      }
  }

  private async playScanningAnimation(itemsToScan: any[]) {
      for (const item of itemsToScan) {
        // Sampling logic
        if (itemsToScan.length > 50) {
          const hasAnalysis = this.analysisMap.has(item.title);
          const isExtremeRating = item.rating !== null && (item.rating <= 2 || item.rating === 5);

          if (!hasAnalysis && !isExtremeRating) {
            const progress = Math.min(1, (itemsToScan.length - 50) / 250);
            const skipProb = 0.5 + progress * 0.3;
            if (Math.random() < skipProb) {
              this.scannedCount++;
              continue;
            }
          }
        }

        this.currentItem = item;
        this.scannedCount++;

        const logs = [];
        logs.push(`正在分析: 《${item.title}》`);
        
        let isAiInsight = false;
        
        if (this.analysisMap.has(item.title)) {
           const thought = this.analysisMap.get(item.title)?.replace(/->/g, ' ') || '';
           logs.push(`[AI 洞察] ${thought}`);
           isAiInsight = true;
           if (!item.comment) {
             logs.push(`> [记录] ${item.create_time} / 评分: ${item.rating || '无'}`);
           }
        } else {
           if (item.rating === 5) logs.push(`>> 评分: 5.0 (高分样本)`);
           if (item.rating <= 2) logs.push(`>> 评分: ${item.rating}.0 (检测到愤怒)`);
           if (item.comment) logs.push(`>> 评论摘要: "${item.comment.slice(0, 32)}..."`);
        }

        for (const logText of logs) {
          this.addLog(logText);
          const stepDelay = isAiInsight ? 80 : 10;
          await new Promise((r) => setTimeout(r, stepDelay));
        }

        let itemDelay = 120;
        if (isAiInsight) itemDelay = 1000;
        else if (item.comment) itemDelay = 300;
        
        await new Promise((r) => setTimeout(r, itemDelay));
      }
  }
}
