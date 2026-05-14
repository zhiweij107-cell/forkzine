export interface User {
  id: string
  name: string
  avatar: string
  title: string
}

export interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
}

export interface Branch {
  id: string
  type: 'refute' | 'supplement' | 'extend' | 'example'
  author: User
  summary: string
  content: string
  createdAt: string
  likes: number
}

export interface Section {
  id: string
  title: string
  content: string
  keyQuote?: string
  imageGradient: string
  branches: Branch[]
}

export interface Interview {
  id: string
  topicId: string
  title: string
  subtitle: string
  creator: User
  coverGradient: string
  summary: string
  sections: Section[]
  createdAt: string
  readCount: number
  branchCount: number
  tags: string[]
}

export interface Topic {
  id: string
  title: string
  description: string
  category: string
  interviewCount: number
  trending: boolean
}

// Mock users
export const mockUsers: User[] = [
  { id: 'u1', name: '林清远', avatar: '', title: '独立写作者 / 前《三联生活周刊》编辑' },
  { id: 'u2', name: '陈思齐', avatar: '', title: '科技记者 / AI 研究观察者' },
  { id: 'u3', name: '张墨言', avatar: '', title: '播客《夜谈》主播 / 文化评论人' },
  { id: 'u4', name: '王拓', avatar: '', title: '产品设计师 / 前字节跳动' },
  { id: 'u5', name: '李沐阳', avatar: '', title: '哲学博士 / 高校教师' },
]

// Mock topics
export const mockTopics: Topic[] = [
  { id: 't1', title: 'AI 会取代人类创作吗？', description: '当AI能够写诗、绘画、作曲，人类创作者的价值何在？', category: '科技与文化', interviewCount: 12, trending: true },
  { id: 't2', title: '远程工作是自由还是陷阱？', description: '数字游民的生活方式背后，我们失去了什么？', category: '工作与生活', interviewCount: 8, trending: true },
  { id: 't3', title: '城市化进程中的乡愁', description: '当故乡变得面目全非，我们如何安放记忆？', category: '社会观察', interviewCount: 5, trending: false },
  { id: 't4', title: '社交媒体正在重塑亲密关系', description: '算法推荐改变了我们认识人的方式，这是进步吗？', category: '科技与生活', interviewCount: 15, trending: true },
  { id: 't5', title: '独处的艺术', description: '在这个永远在线的时代，独处成了一种奢侈品', category: '生活哲学', interviewCount: 7, trending: false },
  { id: 't6', title: '知识付费的困境与出路', description: '当所有人都在"贩卖焦虑"，真正的学习去了哪里？', category: '媒体与教育', interviewCount: 9, trending: false },
]

// Mock interview (featured)
export const mockFeaturedInterview: Interview = {
  id: 'i1',
  topicId: 't1',
  title: '当机器学会了写诗',
  subtitle: '一场关于创作本质的深度对话',
  creator: mockUsers[0],
  coverGradient: 'from-navy via-navy-light to-purple-900',
  summary: '在这次对话中，我们探讨了AI创作与人类创作的本质区别，讨论了「意图」「经验」与「情感真实性」如何定义创作的价值，以及在AI时代，人类创作者应该如何重新定位自己。',
  sections: [
    {
      id: 's1',
      title: '创作的起点：从一个困惑开始',
      content: '最近半年，我一直在思考一个问题——当AI可以在几秒钟内生成一首还不错的诗，或者画出一幅看起来很有意境的画，我作为一个写了十几年文章的人，到底还有什么存在的价值？这个问题不是焦虑，更像是一种好奇。我想知道，创作这件事，到底是什么让它有意义。',
      keyQuote: '当AI可以在几秒钟内生成一首还不错的诗，我们不得不重新审视——创作的价值究竟从何而来？',
      imageGradient: 'from-slate-800 via-indigo-900 to-slate-900',
      branches: [],
    },
    {
      id: 's2',
      title: '意图与偶然：人类创作的不可复制性',
      content: '人类的创作有一个AI目前无法真正具备的东西——「带着伤痕的意图」。当一个诗人写下"我看见湖面上有光"，这背后可能是某个黄昏他独自站在湖边，想起了去世的父亲。这个"光"不只是一个意象，它是一段生命经验的凝结。AI可以生成相似的句子，但它没有那个黄昏，没有那个父亲，没有那种失去后试图在日常中寻找安慰的心境。',
      keyQuote: '人类的创作有一个AI无法具备的东西——「带着伤痕的意图」。',
      imageGradient: 'from-amber-900 via-orange-900 to-red-950',
      branches: [
        {
          id: 'b1',
          type: 'refute',
          author: mockUsers[1],
          summary: '我认为AI也能发展出某种"伪经验"',
          content: '虽然AI没有真实的生命经验，但当它基于海量人类文本训练后，它实际上继承了某种"集体记忆"。当AI写出"我看见湖面上有光"，它背后是千万个人类关于光、关于湖、关于思念的表达的叠加。这不是一个人的伤痛，而是人类共同情感的结晶。这种"伪经验"是否也有它独特的价值？',
          createdAt: '2026-05-08',
          likes: 24,
        },
        {
          id: 'b2',
          type: 'supplement',
          author: mockUsers[4],
          summary: '从现象学角度看，经验的"第一人称性"不可还原',
          content: '从胡塞尔的现象学立场出发，经验的核心特征是它的"第一人称性"——它总是"某个人"的经验。AI处理的是符号和模式，而非活生生的体验流。即便AI能完美模拟表达，它缺乏的是梅洛-庞蒂所说的"身体主体性"。创作不只是语言的编排，它是身体-在-世界-之中的一种回应。',
          createdAt: '2026-05-09',
          likes: 31,
        },
      ],
    },
    {
      id: 's3',
      title: '效率与深度：两种不同的创作逻辑',
      content: 'AI创作的逻辑是效率——给定输入，产出最优的输出。但人类创作往往不是线性的。一个作家可能花三年时间写一本书，中间经历了离婚、搬家、一场大病，这些经历渗透进文字里，让作品有了一种"时间的厚度"。这种厚度不是通过更多的训练数据可以获得的，它需要真实的时间流逝和生命的磨损。',
      keyQuote: '人类创作拥有一种"时间的厚度"——它需要真实的时间流逝和生命的磨损。',
      imageGradient: 'from-emerald-900 via-teal-900 to-cyan-950',
      branches: [
        {
          id: 'b3',
          type: 'extend',
          author: mockUsers[3],
          summary: '也许AI创作和人类创作根本不应该放在同一个维度比较',
          content: '与其争论谁的创作更"真实"，不如接受它们是完全不同范畴的事物。AI创作更像是一面镜子——它反射的是人类集体创作的模式和倾向。从设计角度看，AI是极好的协作工具，它负责效率，人类负责赋予最终的意义和判断。',
          createdAt: '2026-05-10',
          likes: 18,
        },
      ],
    },
    {
      id: 's4',
      title: '共存之道：人类创作者的新定位',
      content: '我越来越觉得，AI时代人类创作者的核心价值不在于"产出"，而在于"见证"。一个好的创作者，本质上是一个好的观察者和感受者。他/她能够在日常中捕捉到那些容易被忽略的瞬间，然后用自己独特的方式把它呈现出来。这个"独特的方式"不是修辞技巧，而是一整个人的存在方式。AI可以帮我们写得更好、更快，但它无法替代我们去"活着"——而创作的根源，正是"活着"本身。',
      imageGradient: 'from-violet-900 via-purple-900 to-fuchsia-950',
      branches: [],
    },
  ],
  createdAt: '2026-05-07',
  readCount: 3420,
  branchCount: 5,
  tags: ['AI创作', '人文思考', '创作者经济'],
}

// More mock interviews for the plaza
export const mockInterviews: Interview[] = [
  mockFeaturedInterview,
  {
    id: 'i2',
    topicId: 't2',
    title: '数字游牧者的真实生活',
    subtitle: '自由职业三年后的反思',
    creator: mockUsers[3],
    coverGradient: 'from-teal-900 via-emerald-900 to-green-950',
    summary: '离开大厂三年，我在清迈、大理、里斯本之间流浪工作。这段经历教会我的不只是如何远程协作...',
    sections: [],
    createdAt: '2026-05-05',
    readCount: 2180,
    branchCount: 3,
    tags: ['远程工作', '数字游民', '生活方式'],
  },
  {
    id: 'i3',
    topicId: 't4',
    title: '算法时代的爱情',
    subtitle: '当我们用滑动来决定缘分',
    creator: mockUsers[2],
    coverGradient: 'from-rose-900 via-pink-900 to-red-950',
    summary: '从相亲到交友App，我们认识伴侣的方式在过去十年发生了剧变。算法真的能理解"合适"吗？',
    sections: [],
    createdAt: '2026-05-03',
    readCount: 4560,
    branchCount: 8,
    tags: ['社交媒体', '亲密关系', '算法'],
  },
  {
    id: 'i4',
    topicId: 't5',
    title: '我选择消失三个月',
    subtitle: '一个社交媒体重度用户的断联实验',
    creator: mockUsers[4],
    coverGradient: 'from-slate-800 via-zinc-800 to-neutral-900',
    summary: '关闭所有社交账号90天后，我重新学会了无聊，也重新学会了思考...',
    sections: [],
    createdAt: '2026-04-28',
    readCount: 1890,
    branchCount: 2,
    tags: ['独处', '数字极简', '心理健康'],
  },
]

export const branchTypeLabels: Record<Branch['type'], string> = {
  refute: '反驳',
  supplement: '补充',
  extend: '延伸',
  example: '实例',
}

export const branchTypeColors: Record<Branch['type'], string> = {
  refute: 'bg-branch-refute',
  supplement: 'bg-branch-supplement',
  extend: 'bg-branch-extend',
  example: 'bg-branch-example',
}
