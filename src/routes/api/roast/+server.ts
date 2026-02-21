import { json, error } from '@sveltejs/kit';
import { jsonrepair } from 'jsonrepair';
import { generateRoast } from '$lib/server/llm';
import { withRateLimit } from '$lib/server/ratelimit';
import type { RequestHandler } from './$types';

const ARCHETYPE_DEFINITIONS_SHORT = `
1. Renaissance Gatekeeper (文艺复兴守门员): Pre-1990s snob. Black & white films. Hates modern pop. Tag: #TimeTraveler #OldSchool
2. Cyber Ascetic (赛博苦行僧): Tarkovsky, Bela Tarr. 3h+ movies. Suffering = Art. Tag: #Masochist #BoringIsDeep
3. Midnight Heartbreak (午夜心碎鉴赏家): Wong Kar-wai, Murakami. Late night posts. Emo. Tag: #EmoKing #Lonely
4. Normie Mimic (现充模仿者): Blockbusters, Best-sellers. Safe taste. AI training data. Tag: #NPC #Basic
5. Spiritual New Yorker (精神纽约客): Woody Allen, Jazz, Modern Art. Pretends to be elite. Tag: #FakeElite #Posh
6. Otaku Fundamentalist (二次元原教旨主义者): Anime/Manga only. 2D > 3D. Seiyuu nerd. Tag: #Weeb #2D4Life
7. Digital Pickle (电子榨菜批发商): Friends, Sitcoms, Rewatching same shows 100x. Comfort zone. Tag: #ComfortBinge #SafeZone
8. Adrenaline Junkie (肾上腺素瘾君子): Horror, Crime, Gore. Needs stimulation. Tag: #GoreHound #ThrillSeeker
9. Internet Bodhisattva (互联网活菩萨): Rates everything 4-5 stars. Never hates. Tag: #TooNice #FakeNice
10. Schizophrenic Omnivore (精神分裂的杂食怪): Bergman + TikTok. High art + Trash. Chaos. Tag: #ChaosEnergy #Random
11. Fandom Guardian (饭圈守护神): Idols. Rate by face. "Brother is working hard". Tag: #FanGirl #DataWorker
12. Self-Help Junkie (成功学韭菜): "Rich Dad Poor Dad". Hustle culture. Wants to get rich via books. Tag: #Hustler #Leek
13. Happy Weirdo (快乐怪胎): Stop-motion, Rick & Morty, cult classics. "Wtf" but happy. Tag: #Weirdo #FunChaos
`;

const ARCHETYPE_DEFINITIONS_LONG = `
### 第一组：高冷与装 X (The Snobs & Intellectuals)

#### 1. 文艺复兴守门员 (The Renaissance Gatekeeper)
* **触发条件：** 标记大量 1990 年以前的电影/书籍，黑白片比例高，对当代流行文化嗤之以鼻。
* **毒舌判词：** “你住在 20 世纪吗？你的片单像是个落了灰的博物馆。在你眼里，彩色电影是不是都算是一种‘技术退步’？只要导演还活着，你就不屑一顾。”
* **Tag：** #黑白滤镜 #厚古薄今 #死人最香

#### 2. 赛博苦行僧 (The Cyber Ascetic)
* **触发条件：** 专看塔可夫斯基、贝拉·塔尔、海德格尔，作品平均时长 > 3小时，或者书籍极其晦涩。
* **毒舌判词：** “观看你的片单需要极大的毅力，你是在修行而不是在娱乐。你是不是觉得看电影如果不痛苦，就不够深刻？建议出门晒晒太阳，维生素D缺乏会影响思考。”
* **Tag：** #长镜头受虐狂 #不说人话 #精神自虐

### 第二组：深情与 Emo (The Romantics & Emos)

#### 3. 午夜心碎鉴赏家 (The Midnight Heartbreak Connoisseur)
* **触发条件：** 喜爱爱情片、悲剧、村上春树、王家卫，打分两极分化（看心情），常在深夜标记。
* **毒舌判词：** “检测到高浓度的矫情。你的主页湿气太重，全是眼泪和遗憾。你是不是觉得全世界的悲伤情歌都是为你写的？建议少看电影多谈恋爱，虽然结果可能一样惨。”
* **Tag：** #恋爱脑晚期 #网抑云资深 #泪失禁体质

#### 4. 现充模仿者 (The Normie Mimic)
* **触发条件：** 只看热门院线、漫威、畅销书榜单，评分和大众评分高度一致。
* **毒舌判词：** “你的品味就像白开水，健康、解渴，但毫无记忆点。你完美避开了所有雷点，也避开了所有个性。AI 最喜欢你这种样本，因为你就是大数据的平均值。”
* **Tag：** #从不踩雷 #大数据之子 #这也太稳了

#### 5. 精神纽约客 (The Spiritual New Yorker)
* **触发条件：** 伍迪艾伦、爵士乐、现代艺术、美剧、脱口秀，喜欢展现中产阶级趣味。
* **毒舌判词：** “虽然你人可能在燕郊，但你的灵魂显然在曼哈顿上东区。你的书影音列表散发着一种‘精致的焦虑感’，仿佛如果不看这些，就无法维持你那脆弱的都市精英人设。”
* **Tag：** #精致利己 #咖啡馆常客 #假装在国外

### 第三组：狂热与硬核 (The Maniacs & Geeks)

#### 6. 二次元原教旨主义者 (The Otaku Fundamentalist)
* **触发条件：** 六成以上是日本动画/漫画/轻小说，对声优、画师如数家珍。
* **毒舌判词：** “三次元的空气是不是让你过敏？你的世界里只有纸片人才是纯洁的。你对现实人类的容忍度为零，但对一个画崩了的作画监督可以记恨十年。”
* **Tag：** #纸片人老公 #现实过敏 #萌即正义

#### 7. 电子榨菜批发商 (The Digital Pickle Wholesaler)
* **触发条件：** 下饭剧、情景喜剧（武林外传/老友记/甄嬛传）、综艺节目反复刷，观看次数极多。
* **毒舌判词：** “你是把电视剧当背景白噪音听的吧？这几部剧被你盘得都包浆了。你不是在看剧，你是在寻求安全感。只要台词还是熟悉的，生活就没有失控。”
* **Tag：** #甄学家 #吃饭必备 #重复狂魔

#### 8. 肾上腺素瘾君子 (The Adrenaline Junkie)
* **触发条件：** 恐怖片、犯罪片、B级片、悬疑推理，甚至一些猎奇重口味内容。
* **毒舌判词：** “你的精神状态让我有点担心。你的片单里充满了血浆、断肢和变态杀手。正常人的解压方式是看喜剧，你的解压方式是看别人怎么被肢解。建议查查心理医生（开玩笑）。”
* **Tag：** #重口味 #越吓人越兴奋 #法治在线VIP

### 第四组：混沌与乐子 (The Chaos & Trolls)

#### 9. 互联网活菩萨 (The Internet Bodhisattva)
* **触发条件：** 无论看什么烂片都打 4-5 星，评论温和，从不骂人。
* **毒舌判词：** “你这辈子就没有讨厌的东西吗？你对烂片的宽容度简直感天动地。片方最爱你的这种观众，因为你连一坨屎都能品出巧克力的回甘。你是来互联网普度众生的吧？”
* **Tag：** #五星批发商 #世界和平 #毫无底线

#### 10. 精神分裂的杂食怪 (The Schizophrenic Omnivore)
* **触发条件：** 同时包含极度冲突的元素（如：伯格曼+土味短剧，黑格尔+霸道总裁）。注意：仅仅是口味杂（如看日漫又看美剧）不算此类，必须是“审美隔离”级别的冲突。
* **毒舌判词：** “你的大脑是个混沌的黑洞。前一秒还在思考宇宙终极真理，后一秒就在看土味短剧傻乐。你的品味跨度之大，让推荐算法直接死机。你不是博爱，你是真的疯。”
* **Tag：** #算法克星 #大雅大俗 #脑回路清奇

### 第五组：焦虑与狂热 (The Anxious & The Fanatics)
#### 11. 饭圈守护神 (The Fandom Guardian)
* **触发条件：** 专门标记某几位特定流量明星的作品（无论烂不烂都打五星），或者大量观看“甜宠”、“古偶”、“耽改”类作品。关键词：帅、甜、演技炸裂（粉丝滤镜版）。
* **毒舌判词：** “你的评分标准非常简单：只要‘哥哥’的脸出现了，那就是五星；只要剧情让‘哥哥’受委屈了，那就是一星。你打的不是分，是数据；你看的不是戏，是 PPT。这五星好评里，有半颗星是给剧情的，剩下四颗半都是给那张脸的吧？”
* **Tag：** #颜值即正义 #哥哥独美 #数据女工 #三观跟着五官走

#### 12. 成功学韭菜 (The Self-Help Junkie)
* **触发条件：** 各种“认知提升”、“商业思维”类的书籍电影。例如：《富爸爸穷爸爸》、《埃隆·马斯克传》、《底层逻辑》，电影全是《华尔街之狼》、《当幸福来敲门》。
* **毒舌判词：** “你的主页散发着一种‘我很想成功但还没成功’的阶级焦虑。你把《华尔街之狼》当入职培训教材，把《当幸福来敲门》当精神伟哥。是不是觉得只要看完了这些电影银行卡余额就会自动多几个零？醒醒吧，真正的资本家都在忙着割你这种人的韭菜，没空看豆瓣。”
* **Tag：** #精神资本家 #知识付费受害者 #狼性文化 #听懂掌声

### 第六组：怪诞与脑洞 (The Weirdos & Visionaries)

#### 13. 快乐怪胎 (The Happy Weirdo)
* **触发条件：** 影：《约翰·威尔逊的十万个怎么做》、**定格动画**。漫：《瑞克和莫蒂》、《探险活宝》、《JOJO的奇妙冒险》。书：《银河系漫游指南》、各种无厘头漫画。 评分通常很高，关键词里常出现“哈哈哈哈”、“神经病”、“卧槽”、“好怪再看一眼”。
* **毒舌判词：** “你的大脑是不是漏电了？你的片单就像是一个打翻了的调色盘，充满了多巴胺过载的痕迹。你拒绝任何严肃和沉闷的东西，只对‘发疯’和‘脑洞’情有独钟。在旁人眼里你是精神病人，在你眼里旁人都是无聊的 NPC。建议少吃菌子，多喝热水。”
* **Tag：** #精神状态美丽 #脑洞漏风 #好怪再看一眼 #人类迷惑行为
`;

export const POST = withRateLimit(async ({ request }: { request: Request }) => {
  const { interests, apiKeys } = await request.json();

  if (!interests || !Array.isArray(interests)) {
    throw error(400, 'Invalid data');
  }

  // Check if we should use the rich prompt (User provided keys)
  const useRichPrompt = apiKeys?.google || apiKeys?.deepseek || apiKeys?.qwen || apiKeys?.chatgpt;

  let prompt = '';

  if (useRichPrompt) {
     // Rich Mode: Use full data and long archetypes
     const interestes_ = interests.map((item: any) => ({
      title: item.title,
      rating: item.rating,
      tags: item.tags,
      comment: item.comment,
      create_time: item.create_time,
      year: item.year
    }));

    prompt = `
    You are a mean, cynical, yet humorous pop culture critic.
    Your style is "Poisonous Tongue, Warm Heart" (毒舌心热) - you roast people not just to be mean, but because you see through their facade. 
    You are like a drunk best friend who tells the brutal truth at 3 AM.

    Analyze the following list of user records (movies/books/music) from Douban.
    
        Analyze this user's taste based on their Douban interests history:
        ${JSON.stringify(interestes_)}
        
        **SAFE ROASTING POLICY (DO NOT VIOLATE):**
        - **RESPECT IDENTITY & JUSTICE:** Never roast the user's stance on gender equality, feminism, LGBTQ+ rights, race, or human rights. 
        - **NO MISOGYNY/DISCRIMINATION:** Do not use gendered insults or patronizing tones. If the user likes feminist content/high-scorers, do NOT roast or mock the movement or values.
        - **ROAST TASTE, NOT VALUES:** Focus your "poisonous tongue" on their pop culture consumption habits, intellectual vanity, over-hyped trends, and contradictions in entertainment taste.
        
        Based on the definitions below, identify the user's specific archetype:
        ${ARCHETYPE_DEFINITIONS_LONG}

        **IMPORTANT Archetype Selection Rules:**
        - **CREATIVE MODE ENABLED:** If the user's taste is distinct and funny but doesn't fit the above 13 archetypes perfectly, **YOU MUST INVENT A NEW ONE**.
        - The new archetype name must be 4-10 Chinese characters, witty, mean, and specific (e.g. "烂片考古学家", "纯爱战神", "午夜emo冠军").
        - **Creativity is preferred.** Don't just pick the safe option.

        Output a JSON object with:
        1. "archetype": A creative, slightly mean 4-word title (e.g. "文艺复兴守门员").
        2. "roast": A vicious, sharp, and humorous critique of their taste. **Do not be short.** Deeply analyze their specific choices (high rating vs low rating). Mention specific titles if possible to roast them.
        3. "tags": 3-5 short, punchy tags. **IMPORTANT:** Do not feel limited to the example tags in the definitions. You are ENCOURAGED to generate creative, specific tags based on the user's unique list (e.g. "#Nolan_Fanboy", "#Ghibli_Addict").
        4. "scores": specific scores (0-100) for the 6-axis psychological profile: "pretentiousness", "mainstream", "nostalgia", "darkness", "geekiness", "hardcore".
        5. "item_analysis": An array of objects, selecting the 50 most noteworthy items. **Prioritize items where the user wrote a comment or gave a conflicting rating.** 
        For each, provide a "thought" string (20-40 Chinese chars). 
        
        **CRITICAL STYLE FOR THOUGHTS:**
        - **Format**: Pure text.
        - **Tone**: "Spicy & Insightful & Smart" (毒舌且一针见血，且有深度)
        - **Content**: Don't just say "Good movie". Say *why* this specific user watched it or rated it that way. Use the timestamp/rating/tags!

        The JSON should follow this structure:
        {
            "archetype": "Name of the archetype (4-10 chars)",
            "roast": "A 1000+ char ruthless roast about their taste contradictions...",
            "tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"],
            "scores": {
                "pretentiousness": 0-100, 
                "mainstream": 0-100,
                "nostalgia": 0-100, 
                "darkness": 0-100, 
                "geekiness": 0-100, 
                "hardcore": 0-100 
            },
            "item_analysis": [
            ["Title", "Thought"], ["Title", "Thought"]
            
            ]
        }
    `;

  } else {
    // Optimized Mode: Use minimal data and short archetypes
    const interestes_ = interests.map((item: any) => ({
      t: item.title,
      r: item.rating,
      g: item.tags,
      c: item.comment,
      d: item.create_time?.slice(0, 10), // Date only
    }));

    prompt = `
    Role: You are a mean, cynical, yet humorous culture critic. Your style is "Poisonous Tongue, Warm Heart" (毒舌心热)
    Task: Roast this Douban user's taste in Chinese.  You roast people not just to be mean, but because you see through their facade.

    User Data:
    ${JSON.stringify(interestes_)}
    
    **SAFE ROASTING POLICY (CRITICAL):**
    - Do NOT be misogynistic or attack identity (gender, race, etc.). 
    - If user likes feminist content/justice, do NOT roast the movement or values. 
    - Roast their pop culture taste and intellectual vanity ONLY.
    
    Archetypes:
    ${ARCHETYPE_DEFINITIONS_SHORT}

    Rules:
    1. Identify archetype from list. BUT: If user doesn't fit perfectly, YOU MUST INVENT a new witty 4-10 char Chinese title (e.g. "烂片考古学家"). Creativity is preferred.
    2. Roast: Brutal, specific, funny. Must be 500+ chars. 
    3. Scores Analysis: 6-axis: pretentiousness, mainstream, nostalgia, darkness, geekiness, hardcore.
    4. Tags: 3-5 punchy tags.
    5. Item Analysis: Pick 30 interesting items. Comment (thought) must be spicy/insightful (20-40 chars text).

    Output JSON:
    {
      "archetype": "Name",
      "roast": "Content...",
      "tags": ["Tag1", "Tag2"],
      "scores": { "pretentiousness": 0-100, "mainstream": 0-100, "nostalgia": 0-100, "darkness": 0-100, "geekiness": 0-100, "hardcore": 0-100 },
      "item_analysis": [["Title", "Thought"], ["Title", "Thought"]]
    }
  `;
  }

  try {
    const llmResult = await generateRoast(prompt, apiKeys);
    const text = llmResult.text;
    console.log(`[Roast] Generated by ${ llmResult.model }`);

    // Clean up markdown code blocks if present
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Robust JSON extraction: Find first '{' and count braces to find matching '}'
    const firstOpen = cleanText.indexOf('{');
    let extractedJSON = null;

    if (firstOpen !== -1) {
      let balance = 0;
      for (let i = firstOpen;i < cleanText.length;i++) {
        if (cleanText[i] === '{') balance++;
        else if (cleanText[i] === '}') balance--;

        if (balance === 0) {
          extractedJSON = cleanText.substring(firstOpen, i + 1);
          break;
        }
      }
    }

    // Fallback: If structure is broken, try the old greedy method or just use the whole text if it looks like JSON
    if (!extractedJSON) {
      const lastClose = cleanText.lastIndexOf('}');
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        extractedJSON = cleanText.substring(firstOpen, lastClose + 1);
      } else {
        extractedJSON = cleanText;
      }
    }

    let finalJSON;
    try {
      finalJSON = JSON.parse(jsonrepair(extractedJSON));
    } catch (e) {
      // Fallback: Try to fix "Shell-style" comments (#) which some LLMs hallucinate
      // We only do this if normal repair fails, to avoid corrupting valid strings containing #
      console.warn('JSON repair failed, trying aggressive comment cleanup...');
      const patched = extractedJSON.replace(/, #/g, ', //');
      finalJSON = JSON.parse(jsonrepair(patched));
    }

    return json({
      ...finalJSON,
      model: llmResult.model
    });
  } catch (e: any) {
    console.error('Roast Generation Error:', e);
    const message = e instanceof Error ? e.message : 'Unknown error occurred during generation';
    throw error(500, `Failed to generate roast: ${ message }`);
  }
});
