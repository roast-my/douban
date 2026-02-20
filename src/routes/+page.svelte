<script lang="ts">
  import RoastCard from '../components/RoastCard.svelte';
  import TypewriterText from '../components/TypewriterText.svelte';
  import { Roaster } from '$lib/roast.svelte';
  import {fade, fly, scale, slide} from 'svelte/transition';
  import { onMount } from 'svelte';

  const roaster = new Roaster();

  // Log state with IDs for stable rendering
  let logContainer = $state<HTMLDivElement>();

  // Auto-scroll logs
  $effect(() => {
    // Trigger scroll when logs length changes
    if (logContainer && roaster.systemLogs.length) {
      // Use requestAnimationFrame to wait for DOM update (height change)
      requestAnimationFrame(() => {
        logContainer!.scrollTop = logContainer!.scrollHeight;
      });
    }
  });

  // Custom API Keys
  let showApiKeys = $state(false);
  let apiKeys = $state({
    google: '',
    deepseek: '',
    qwen: ''
  });

  onMount(() => {
    const saved = localStorage.getItem('douban_roast_api_keys');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        apiKeys = { ...apiKeys, ...parsed };
      } catch (e) {
        console.error('Failed to parse saved API keys', e);
      }
    }
  });

  $effect(() => {
    // Only save if keys are present (basic debounce logic via Svelte batching)
    if (apiKeys.google || apiKeys.deepseek || apiKeys.qwen) {
      localStorage.setItem('douban_roast_api_keys', JSON.stringify(apiKeys));
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    await roaster.start(apiKeys);
  }
</script>

<div
  class="min-h-screen bg-[#fdfdfc] text-[#494949] font-sans p-4 pb-16 flex flex-col items-center justify-center selection:bg-[#007722]/70 selection:text-white relative overflow-hidden"
>
  <!-- Decorative Poster Wall Background -->
  {#if roaster.status === 'idle' || roaster.status === 'error'}
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
  {#if (roaster.status === 'scanning' || roaster.status === 'analyzing') && roaster.currentItem?.cover_url}
    <div
      class="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out blur-xl opacity-30 scale-105"
      style="background-color: #eee;"
    ></div>
    <div class="absolute inset-0 bg-[#fdfdfc]/80 backdrop-blur-sm"></div>
  {/if}

  <div class="relative z-10 w-full max-w-5xl grid grid-cols-1 place-items-center">
    {#if roaster.status === 'idle' || roaster.status === 'error'}
      <div
        class="w-full max-w-4xl col-start-1 row-start-1 animate-in fade-in zoom-in duration-500 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 lg:gap-16 p-4"
      >
        <!-- Left Column: Hero Image (Poster) -->
        <div
          class="w-full max-w-[280px] md:max-w-[320px] shrink-0 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500 ease-out z-10"
        >
          <a
            href="https://www.douban.com/people/14188082/status/2532037238/"
            target="_blank"
            rel="noopener noreferrer"
            class="relative block rounded-lg shadow-sm border-[6px] border-white overflow-hidden aspect-[9/14] bg-slate-100 group"
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
              <p class="text-[#007722]/70 bg-white/70 p-3 text-sm leading-relaxed pointer-events-none">
                谢谢做这张图的豆瓣用户
                <span class="font-bold underline decoration-dotted underline-offset-2">@mui</span>
                <br />

                如有侵权，请联系我删除。
              </p>
            </div>
          </a>
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
            class="w-full space-y-6 bg-white p-8 rounded-xl shadow-[0_20px_50px_-12px_rgba(0,119,34,0.15)] border border-[#007722]/10 relative backdrop-blur-sm"
          >
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#007722]/70 to-[#42bd56] rounded-t-xl"></div>

            <div class="space-y-2">
              <label
                for="uid"
                class="text-xs font-bold text-[#007722]/70 tracking-wide ml-1 flex items-center gap-1"
              >
                豆瓣 ID
                <div class="relative group cursor-help inline-flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-[#007722]/50 hover:text-[#007722] transition-colors"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <div
                    class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2 bg-white bg-opacity-80 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-lg"
                  >就是你豆瓣链接后面那一坨数字！！！ 不是你的网名！！！
            
                  </div>
                </div>
              </label>
              <input
                id="uid"
                type="text"
                bind:value={roaster.userId}
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
                    class="p-3 border rounded-lg text-xs font-bold transition-all {roaster.type === t.val
                      ? `${t.active} text-white shadow-md transform scale-100`
                      : `border-gray-100 bg-[#f9f9f9] text-gray-400 ${t.hover} scale-95`}"
                    onclick={() => (roaster.type = t.val)}
                  >
                    {t.label}
                  </button>
                {/each}
              </div>
            </div>

            {#if roaster.errorMsg}
              <div
                class="p-3 bg-[#f9f9f9] text-gray-400 text-sm rounded border border-gray-100 flex items-center gap-2 animate-in slide-in-from-top-1"
              >
                <span class="font-bold">!</span>
                {roaster.errorMsg}
              </div>
            {/if}

            <!-- API Key Configuration (Collapsible) -->
            <div class="border-t border-dashed border-gray-200 pt-4">
              <button
                type="button"
                class="flex items-center gap-2 text-xs font-bold text-[#007722]/50 hover:text-[#007722] transition-colors w-full"
                onclick={() => (showApiKeys = !showApiKeys)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="transition-transform duration-200 {showApiKeys ? 'rotate-90' : ''}"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span class="cursor-pointer">设置 API Key</span>
              </button>

              {#if showApiKeys}
                <div transition:slide={{ duration: 200 }} class="mt-3 space-y-3">
                  <div class="p-3 bg-yellow-50 text-yellow-800 text-[11px] rounded leading-relaxed border border-yellow-100">
                    <span class="font-bold text-sm block mb-1">💸 哭穷</span>
                    大模型烧钱如流水，开发者马上要灯枯油尽了。
                    
                    如若遇到请求长时间不返回的情况，请在下方填入您自己的 API Key。
                    您的 Key 仅保留在本地浏览器，通过安全连接直接请求。
                    <br />
                    或者给 <a href="https://github.com/roast-my/douban?tab=readme-ov-file#support-me" target="_blank" class="underline hover:text-yellow-600 font-bold">开发者打钱</a>，每个人给我打一毛钱我就能回本了，然后给大模型充值，让它继续为人民服务（
                  </div>
                  
                  <div class="space-y-3">
                    <div class="flex items-center gap-3">
                      <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" class="w-16 shrink-0 text-xs font-mono text-[#007722]/70 hover:text-[#007722] hover:underline text-right">DeepSeek</a>
                      <input
                        type="password"
                        autocomplete="off"
                        bind:value={apiKeys.deepseek}
                        class="flex-1 bg-gray-50 border border-gray-100 rounded p-2 text-xs focus:outline-none focus:border-[#42bd56] transition-colors font-mono placeholder:text-gray-300"
                      />
                    </div>
                    
                    <div class="flex items-center gap-3">
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="w-16 shrink-0 text-xs font-mono text-[#007722]/70 hover:text-[#007722] hover:underline text-right">Gemini</a>
                      <input
                        type="password"
                        autocomplete="off"
                        bind:value={apiKeys.google}
                        class="flex-1 bg-gray-50 border border-gray-100 rounded p-2 text-xs focus:outline-none focus:border-[#42bd56] transition-colors font-mono placeholder:text-gray-300"
                      />
                    </div>

                    <div class="flex items-center gap-3">
                      <a href="https://dashscope.console.aliyun.com/apiKey" target="_blank" rel="noopener noreferrer" class="w-16 shrink-0 text-xs font-mono text-[#007722]/70 hover:text-[#007722] hover:underline text-right">Qwen</a>
                      <input
                        type="password"
                        autocomplete="off"
                        bind:value={apiKeys.qwen}
                        class="flex-1 bg-gray-50 border border-gray-100 rounded p-2 text-xs focus:outline-none focus:border-[#42bd56] transition-colors font-mono placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>
              {/if}
            </div>

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
    {:else if roaster.status === 'scanning' || roaster.status === 'analyzing'}
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
              序列: {roaster.scannedCount.toString().padStart(4, '0')}
            </div>

            {#if roaster.currentItem}
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
                  {roaster.currentItem.title}
                </h3>

                <div class="text-xs font-mono text-gray-400 mb-3 flex items-center gap-2">
                  <span>{roaster.currentItem.create_time.slice(0, 10)}</span>
                  {#if roaster.currentItem.rating}
                    <span class="text-[#007722] font-bold bg-[#007722]/5 px-1.5 py-0.5 rounded"
                      >{roaster.currentItem.rating + '星'}</span
                    >
                  {/if}
                </div>

                {#if roaster.currentItem.comment}
                  <div
                    class="text-[13px] font-serif text-[#666] italic leading-relaxed pl-3 border-l-2 border-[#007722]/20 line-clamp-6"
                  >
                    {roaster.currentItem.comment}
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
              {#each roaster.systemLogs as log (log.id)}
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
                进度: {Math.min(roaster.scannedCount, roaster.totalItems)} / {roaster.totalItems}
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else if roaster.status === 'success' && roaster.result}
      <div class="w-full max-w-3xl col-start-1 row-start-1 animate-in zoom-in-95 duration-500">
        <RoastCard result={roaster.result} />
      </div>
    {/if}
  </div>

  <div class="absolute bottom-4 left-0 w-full text-center select-none ">
    <p class="text-[11px] text-[#007722]/50 font-mono mx-6">
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
