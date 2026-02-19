<script lang="ts">
  import RoastCard from '$lib/components/RoastCard.svelte';
  import TypewriterText from '$lib/components/TypewriterText.svelte';
  import {fade, fly, scale} from 'svelte/transition';

  let userId = $state('');
  let type = $state('book');
  let status = $state<'idle' | 'scanning' | 'analyzing' | 'success' | 'error'>('idle');
  let result = $state<any>(null);
  let errorMsg = $state('');

  // Scan animation state
  let scannedCount = $state(0);
  let currentItem = $state<any>(null);
  let totalItems = $state(0);

  // Log state with IDs for stable rendering
  let logCounter = 0;
  let systemLogs = $state<{id: number; text: string; speed?: number}[]>([]);
  let analysisMap = $state(new Map<string, string>());
  let logContainer = $state<HTMLDivElement>();

  // Auto-scroll logs
  $effect(() => {
    // Trigger scroll when logs length changes
    if (logContainer && systemLogs.length) {
      // Use requestAnimationFrame to wait for DOM update (height change)
      requestAnimationFrame(() => {
        logContainer!.scrollTop = logContainer!.scrollHeight;
      });
    }
  });

  // Ingestion state
  let ingestionInterval: any;
  let itemsToScan: any[] = []; // Filtered list

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!userId) {
      errorMsg = '请输入豆瓣ID';
      return;
    }

    status = 'scanning';
    errorMsg = '';
    scannedCount = 0;
    currentItem = null;
    logCounter = 0;
    systemLogs = [{id: logCounter++, text: '正在建立精神连接...'}];
    analysisMap.clear();

    try {
      // 1. Fetch Data
      systemLogs = [...systemLogs, {id: logCounter++, text: '正在获取公开数据...'}];
      const fetchRes = await fetch('/api/fetch-douban', {
        method: 'POST',
        body: JSON.stringify({userId, type}),
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

      // FILTER: Only items with tags or rating
      itemsToScan = doubanData.interests.filter((i: any) => (i.tags && i.tags.length > 0) || i.rating || i.comment);
      totalItems = itemsToScan.length;

      if (totalItems < 5) {
        throw new Error(
          `数据量不足，再多${type === 'book' ? '读几本书' : type === 'movie' ? '看几部电影' : '听几张专辑'}吧`,
        );
      }

      systemLogs = [...systemLogs, {id: logCounter++, text: `访问许可确认. 锁定 ${totalItems} 条有效记录.`}];

      // 2. Start AI Roast (Blocking)
      systemLogs = [...systemLogs, {id: logCounter++, text: '正在连接 Gemini 2.5 侧写模型...'}];
      systemLogs = [...systemLogs, {id: logCounter++, text: '开始深度模式识别...'}];

      // --- DATA INGESTION VISUALIZATION START ---
      const ingestionSpeed = 120;
      let ingestionIndex = 0;
      // Use the full list for ingestion visual to make it look busier
      const ingestionSource = doubanData.interests;

      ingestionInterval = setInterval(() => {
        if (ingestionIndex >= ingestionSource.length) ingestionIndex = 0;
        const item = ingestionSource[ingestionIndex];

        // Show cover and title rapidly
        currentItem = item;
        // Don't increment real counter here

        // Add rapid technical logs
        // Add rapid technical logs
        if (Math.random() > 0.5) {
          const date = item.create_time?.slice(0, 10) || '未知日期';
          const rate = item.rating ? `${item.rating}星` : '';
          const tags = item.tags && item.tags.length > 0 ? `[${item.tags[0]}]` : '';

          const logText = `[读取] ${date} ${item.title.slice(0, 12)}... ${rate} ${tags}`;
          systemLogs = [...systemLogs, {id: logCounter++, text: logText}];
          if (systemLogs.length > 15) systemLogs = systemLogs.slice(1);
        }

        ingestionIndex++;
      }, ingestionSpeed);
      // ------------------------------------------

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
        }),
        headers: {'Content-Type': 'application/json'},
      });

      // Stop ingestion animation
      clearInterval(ingestionInterval);
      scannedCount = 0; // Reset for actual scan

      if (!roastRes.ok) {
        let errorMessage = 'AI 分析失败';
        try {
          const errData = await roastRes.json();
          if (errData.message) errorMessage = errData.message;
        } catch (e) {
          // ignore json parse error
        }
        throw new Error(errorMessage);
      }
      const roastData = await roastRes.json();

      // Populate analysis map
      if (roastData.item_analysis) {
        // Build map for faster lookup (though itemsToScan is usually small < 30)
        const commentMap = new Map();
        itemsToScan.forEach((i: any) => {
          if (i.comment) commentMap.set(i.title, i.comment);
        });

        roastData.item_analysis.forEach((analysis: any) => {
          analysisMap.set(analysis.title, analysis.thought);
          if (commentMap.has(analysis.title)) {
            analysis.user_comment = commentMap.get(analysis.title);
          }
        });
        systemLogs = [...systemLogs, {id: logCounter++, text: '侧写向量已同步. 开始回放分析.'}];
      }

      // Store result for later
      result = roastData;

      // 3. Play "Scanning" Animation (With Data)
      for (const item of itemsToScan) {
        // Random Sampling Logic
        if (itemsToScan.length > 50) {
          const hasAnalysis = analysisMap.has(item.title);
          const isExtremeRating = item.rating !== null && (item.rating <= 2 || item.rating === 5);

          if (!hasAnalysis && !isExtremeRating) {
            // Calculate skip probability: 0.5 at 50 items, up to 0.8 at 300+ items
            const progress = Math.min(1, (itemsToScan.length - 50) / 250);
            const skipProb = 0.5 + progress * 0.3;

            if (Math.random() < skipProb) {
              // Skip this item (but count it for progress)
              scannedCount++;
              continue;
            }
          }
        }

        currentItem = item;
        scannedCount++;

        // Add System Log based on attributes
        const logs = [];
        logs.push(`正在分析: 《${item.title}》`);

        let isAiInsight = false;

        // CHECK FOR REAL AI ANALYSIS
        if (analysisMap.has(item.title)) {
          // Clean up any potential arrows from AI response
          const thought = analysisMap.get(item.title)?.replace(/->/g, ' ') || '';
          logs.push(`[AI 洞察] ${thought}`);
          isAiInsight = true;

          // If no comment, show time/rating context
          if (!item.comment) {
            logs.push(`> [记录] ${item.create_time} / 评分: ${item.rating || '无'}`);
          }
        } else {
          // Fallback to basic heuristics
          if (item.rating === 5) logs.push(`>> 评分: 5.0 (高分样本)`);
          if (item.rating <= 2) logs.push(`>> 评分: ${item.rating}.0 (检测到愤怒)`);
          if (item.comment) logs.push(`>> 评论摘要: "${item.comment.slice(0, 32)}..."`);
        }

        // Push logs
        for (const logText of logs) {
          systemLogs = [...systemLogs, {id: logCounter++, text: logText}];
          if (systemLogs.length > 50) systemLogs = systemLogs.slice(1);

          // Slower typing / pause for AI insights
          const stepDelay = isAiInsight ? 80 : 10;
          await new Promise((r) => setTimeout(r, stepDelay));
        }

        // Delay between items
        let itemDelay = 120; // Base speed for items without comments
        if (isAiInsight) {
          itemDelay = 1000;
        } else if (item.comment) {
          itemDelay = 300; // Much slower to read comments
        }
        await new Promise((r) => setTimeout(r, itemDelay));
      }

      status = 'analyzing';
      systemLogs = [...systemLogs, {id: logCounter++, text: '正在生成最终诊断报告...'}];

      // Final dramatic pause
      await new Promise((r) => setTimeout(r, 800));

      status = 'success';
    } catch (err: any) {
      if (ingestionInterval) clearInterval(ingestionInterval);
      status = 'error';
      errorMsg = err.message || '未知错误';
      console.error(err);
    }
  }
</script>

<div
  class="min-h-screen bg-[#fdfdfc] text-[#494949] font-sans p-4 pb-16 flex flex-col items-center justify-center selection:bg-[#007722]/70 selection:text-white relative overflow-hidden"
>
  <!-- Decorative Poster Wall Background -->
  {#if status === 'idle' || status === 'error'}
    <div
      class="absolute inset-0 opacity-[0.02] z-0 w-[120vw] -ml-10 pointer-events-none flex flex-wrap items-center justify-center p-4 gap-9 overflow-hidden"
    >
      {#each Array(72) as _, i}
        {@const randomRotation = Math.random() * 4 - 2}
        <div
          class="w-24 h-36 bg-black rounded-sm transform"
          style="transform: rotate({randomRotation}deg) scale({1 + (i % 3) * 0.1})"
        ></div>
      {/each}
    </div>
  {/if}

  <!-- Dynamic Background -->
  {#if (status === 'scanning' || status === 'analyzing') && currentItem?.cover_url}
    <div
      class="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out blur-xl opacity-30 scale-105"
      style="background-color: #eee;"
    ></div>
    <div class="absolute inset-0 bg-[#fdfdfc]/80 backdrop-blur-sm"></div>
  {/if}

  <div class="relative z-10 w-full max-w-5xl grid grid-cols-1 place-items-center">
    {#if status === 'idle' || status === 'error'}
      <div
        class="w-full max-w-4xl col-start-1 row-start-1 animate-in fade-in zoom-in duration-500 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 lg:gap-16 p-4"
      >
        <!-- Left Column: Hero Image (Poster) -->
        <div
          class="w-full max-w-[280px] md:max-w-[320px] shrink-0 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500 ease-out z-10"
        >
          <div
            class="relative rounded-lg shadow-sm border-[6px] border-white overflow-hidden aspect-[9/14] bg-slate-100 group"
          >
            <!-- Placeholder color while loading or if missing -->
            <div
              class="absolute inset-0 bg-[#f0f3f0] flex items-center justify-center text-[#007722]/20 font-bold tracking-widest text-xs"
            >
              豆瓣画像
            </div>
            <img
              src="/douban.webp"
              alt="Douban Life"
              class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
            />

            <!-- Attribution Overlay -->
            <div
              class="absolute inset-0 bg-white/40 flex items-center justify-center p-6 opacity-0 group-hover:opacity-100 group-hover:backdrop-blur-sm transition-opacity duration-300 text-center"
            >
              <p class="text-[#007722]/70 bg-white/70 p-3 text-sm leading-relaxed">
                谢谢做这张图的豆瓣用户
                <a class="decoration-dotted underline-offset-2 underline" href="https://www.douban.com/people/14188082/status/2532037238/"
                  >@mui</a
                >
                <br />

                如有侵权，请联系我删除。
              </p>
            </div>
          </div>
        </div>

        <!-- Right Column: Login Form -->
        <div class="w-full max-w-md flex flex-col items-center gap-4">
          <div class="text-center mb-8">
            <h1
              class="text-3xl md:text-5xl font-extrabold text-[#007722] tracking-tight mb-2 flex items-center justify-center gap-3 md:gap-4"
            >
              <span>ROAST MY DOUBAN</span>
            </h1>
            <p class="text-[#007722] text-sm tracking-[0.2em] font-bold">豆瓣标记精神状态分析</p>
          </div>

          <form
            onsubmit={handleSubmit}
            class="w-full space-y-6 bg-white p-8 rounded-xl shadow-[0_20px_50px_-12px_rgba(0,119,34,0.15)] border border-[#007722]/10 relative overflow-hidden backdrop-blur-sm"
          >
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#007722]/70 to-[#42bd56]"></div>

            <div class="space-y-2">
              <label
                for="uid"
                class="text-xs font-bold text-[#007722]/70 tracking-wide ml-1 flex items-center gap-1"
              >
                豆瓣 ID
              </label>
              <input
                id="uid"
                type="text"
                bind:value={userId}
                autocomplete="off"
                placeholder="例如: 1000001 或 ahbei"
                class="w-full bg-[#f9f9f9] border border-gray-100 rounded-lg p-3 focus:outline-none focus:border-[#42bd56] focus:ring-2 focus:ring-[#42bd56]/20 transition-all font-mono placeholder:text-gray-300 text-[#494949] text-sm"
              />
              <p class="text-[10px] text-gray-400 ml-1">* 仅支持公开帐号</p>
            </div>

            <div class="space-y-4">
              <div class="text-sm font-bold text-[#007722]/70 tracking-wide mb-2">分析类别</div>
              <div class="grid grid-cols-3 gap-3">
                {#each [{val: 'book', label: '书籍', active: 'bg-[#42bd56] border-[#42bd56]', hover: 'hover:text-[#42bd56] hover:bg-[#42bd56]/5'}, {val: 'movie', label: '电影', active: 'bg-[#2389eb] border-[#2377cb]', hover: 'hover:text-[#2377cb] hover:bg-[#2377cb]/5'}, {val: 'music', label: '音乐', active: 'bg-[#ff9600] border-[#ff9600]', hover: 'hover:text-[#ff9600] hover:bg-[#ff9600]/5'}] as t}
                  <button
                    type="button"
                    class="p-3 border rounded-lg text-xs font-bold transition-all {type === t.val
                      ? `${t.active} text-white shadow-md transform scale-100`
                      : `border-gray-100 bg-[#f9f9f9] text-gray-400 ${t.hover} scale-95`}"
                    onclick={() => (type = t.val)}
                  >
                    {t.label}
                  </button>
                {/each}
              </div>
            </div>

            {#if errorMsg}
              <div
                class="p-3 bg-[#f9f9f9] text-gray-400 text-sm rounded border border-gray-100 flex items-center gap-2 animate-in slide-in-from-top-1"
              >
                <span class="font-bold">!</span>
                {errorMsg}
              </div>
            {/if}

            <button
              type="submit"
              class="w-full py-4 bg-[#42bd56] hover:bg-[#42bd56] cursor-pointer text-white font-bold tracking-widest text-sm transition-all rounded-lg shadow-lg hover:shadow-xl active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
            >
              <span>开始分析</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 opacity-80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><line
                  x1="5"
                  y1="12"
                  x2="19"
                  y2="12"
                ></line><polyline points="12 5 19 12 12 19"></polyline></svg
              >
            </button>
          </form>
        </div>
      </div>
    {:else if status === 'scanning' || status === 'analyzing'}
      <div
        class="w-full max-w-4xl col-start-1 row-start-1 flex flex-col items-center gap-6 md:gap-16 animate-in fade-in zoom-in duration-500"
      >
        <div class="text-center">
          <h1
            class="text-3xl md:text-5xl font-extrabold text-[#007722] tracking-tight mb-2 flex items-center justify-center gap-3 md:gap-4"
          >
            <span>ROAST MY DOUBAN</span>
          </h1>
          <p class="text-[#007722] text-sm tracking-[0.2em] font-bold">豆瓣标记精神状态分析</p>
        </div>

        <div
          class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-center bg-white rounded-xl shadow-sm border border-[#eef7f2] overflow-hidden"
        >
          <!-- Left: Current Item Visual -->
          <div
            class="flex flex-row items-start justify-start px-6 py-12 md:py-16 bg-[#fdfdfc] border-b md:border-b-0 md:border-r border-gray-100 h-[300px] max-h-[400px] md:h-[400px] relative transition-all"
            in:scale
          >
            <div class="absolute top-4 left-4 text-[10px] font-mono text-[#007722]/30">
              序列: {scannedCount.toString().padStart(4, '0')}
            </div>

            {#if currentItem}
              <!-- Left: Cover/Teapot -->
              <div class="relative shrink-0 mr-6 group">
                <div
                  class="w-28 h-40 md:w-36 md:h-52 bg-gray-50 flex flex-col items-center justify-center text-[#007722]/70 border border-gray-200 rounded shadow-sm"
                >
                  <span class="font-mono text-xs mb-1">HTTP 418</span>
                  <span class="text-[11px]">It's a teapot</span>
                </div>
              </div>

              <!-- Right: Content -->
              <div class="flex-1 min-w-0 flex flex-col items-start text-left h-full">
                <h3 class="font-bold text-lg text-[#444] leading-tight mb-2 line-clamp-2">
                  {currentItem.title}
                </h3>

                <div class="text-xs font-mono text-gray-400 mb-3 flex items-center gap-2">
                  <span>{currentItem.create_time.slice(0, 10)}</span>
                  {#if currentItem.rating}
                    <span class="text-[#007722] font-bold bg-[#007722]/5 px-1.5 py-0.5 rounded"
                      >{currentItem.rating + '星'}</span
                    >
                  {/if}
                </div>

                {#if currentItem.comment}
                  <div
                    class="text-[13px] font-serif text-[#666] italic leading-relaxed pl-3 border-l-2 border-[#007722]/20 line-clamp-6"
                  >
                    {currentItem.comment}
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Right: System Log -->
          <div
            class="h-[300px] max-h-[400px] md:h-[400px] bg-[#f8f9f8] text-[#007722]/70 font-mono text-[11px] p-6 flex flex-col relative overflow-hidden"
          >
            <div class="flex justify-between items-center border-b border-[#007722]/10 pb-2">
              <span class="font-bold tracking-widest text-[#007722]/40">分析日志</span>
              <span class="animate-pulse text-[#007722]/40">● 录制</span>
            </div>

            <div
              class="flex-1 overflow-y-auto my-2 space-y-2 scrollbar-hide text-xs md:text-[13px]"
              bind:this={logContainer}
            >
              {#each systemLogs as log (log.id)}
                <TypewriterText
                  text={log.text}
                  speed={log.speed || 10}
                  class="leading-relaxed {log.text.includes('[AI 洞察]') || log.text.includes('[INSIGHT]')
                    ? 'bg-[#f9f9f9] text-gray-500/90 p-1 rounded border border-gray-100'
                    : 'text-[#007722]/70'}"
                />
              {/each}
            </div>

            <!-- Progress -->
            <div class="pt-2 border-t border-[#007722]/10 flex justify-between items-end text-[#007722]/30">
              <div>
                进度: {Math.min(scannedCount, totalItems)} / {totalItems}
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else if status === 'success' && result}
      <div class="w-full max-w-3xl col-start-1 row-start-1 animate-in zoom-in-95 duration-500">
        <RoastCard {result} />
      </div>
    {/if}
  </div>

  <div class="absolute bottom-4 left-0 w-full text-center select-none ">
    <p class="text-[10px] text-[#007722]/50 font-mono mx-6">
      Designed by <a target="_blank" rel="noopener noreferrer" href="https://github.com/anig1scur">Yanxin</a> and made with Gemini.
      内容由 AI 生成，仅供娱乐，请勿自行代入或过度解读
    </p>
  </div>
</div>

<style>
  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-5px);
    }
    75% {
      transform: translateX(5px);
    }
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
