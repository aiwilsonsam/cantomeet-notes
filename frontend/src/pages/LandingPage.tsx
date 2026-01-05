import { useNavigate } from 'react-router-dom';
import { 
  Mic, 
  Zap, 
  Globe, 
  Clock, 
  Users, 
  FileText, 
  ArrowRight, 
  Check,
  PlayCircle,
  Star,
  TrendingUp,
  Shield
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                M
              </div>
              <span className="text-xl font-bold text-slate-900">CantoMeet Notes</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-slate-600 hover:text-slate-900 font-medium text-sm">功能</a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 font-medium text-sm">定价</a>
              <button
                onClick={() => navigate('/auth')}
                className="text-slate-600 hover:text-slate-900 font-medium text-sm"
              >
                登录
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-xl font-semibold text-sm shadow-lg shadow-primary-900/10 transition-all"
              >
                免费试用
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-6">
              <Star size={16} className="fill-primary-600" />
              <span>为大湾区企业量身打造的会议助手</span>
            </div>
            
            <h1 className="text-6xl font-bold text-slate-900 leading-tight mb-6">
              让每场会议的价值
              <br />
              <span className="bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
                清晰可见
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 leading-relaxed mb-10 max-w-2xl mx-auto">
              AI 驱动的会议纪要生成工具，专为粤语、英语、普通话混合环境设计。
              自动转录、智能总结、提取行动项，让您专注于讨论本身。
            </p>

            <div className="flex items-center justify-center gap-4 mb-12">
              <button
                onClick={() => navigate('/auth')}
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary-900/20 flex items-center gap-2 transition-all hover:scale-105"
              >
                立即开始
                <ArrowRight size={20} />
              </button>
              <button className="bg-white hover:bg-slate-50 text-slate-900 px-8 py-4 rounded-xl font-bold text-lg shadow-lg border border-slate-200 flex items-center gap-2 transition-all">
                <PlayCircle size={20} />
                观看演示
              </button>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-600" />
                <span>14 天免费试用</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-600" />
                <span>无需信用卡</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-600" />
                <span>随时取消</span>
              </div>
            </div>
          </div>

          {/* Hero Image / Demo */}
          <div className="mt-20 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 aspect-video flex items-center justify-center">
                <div className="text-white text-center">
                  <Mic size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-slate-400">产品演示截图占位</p>
                </div>
              </div>
            </div>
            {/* Floating Elements */}
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary-100 rounded-full blur-2xl opacity-60"></div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-blue-100 rounded-full blur-2xl opacity-60"></div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem number="95%" label="转录准确率" />
            <StatItem number="10min" label="平均处理时间" />
            <StatItem number="500+" label="企业用户" />
            <StatItem number="50k+" label="会议已处理" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">强大功能，简单易用</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              从录音到行动项，全流程自动化，让您的团队更高效
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Mic className="text-primary-600" size={28} />}
              title="三语混合识别"
              description="业界领先的 ASR 技术，完美支持粤语、英语、普通话混合场景，识别准确率高达 95%。"
              color="primary"
            />
            <FeatureCard
              icon={<Zap className="text-yellow-600" size={28} />}
              title="智能摘要生成"
              description="基于 GPT-4 的 AI 总结引擎，自动提取会议要点、关键决策和行动项。"
              color="yellow"
            />
            <FeatureCard
              icon={<Globe className="text-blue-600" size={28} />}
              title="本地化优化"
              description="针对大湾区商业术语优化，理解金融、科技、制造业等领域的专业表达。"
              color="blue"
            />
            <FeatureCard
              icon={<Clock className="text-green-600" size={28} />}
              title="实时处理"
              description="支持 1-2 小时长会议，后台异步处理，实时查看进度，完成后自动通知。"
              color="green"
            />
            <FeatureCard
              icon={<Users className="text-purple-600" size={28} />}
              title="团队协作"
              description="多人共享工作区，统一管理会议纪要，支持权限控制和成员邀请。"
              color="purple"
            />
            <FeatureCard
              icon={<FileText className="text-pink-600" size={28} />}
              title="模板定制"
              description="预设多种会议模板（产品评审、销售会议等），也可自定义纪要格式。"
              color="pink"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">三步即可获得专业会议纪要</h2>
            <p className="text-lg text-slate-600">简单、快速、专业</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <StepCard
              number="1"
              title="上传录音"
              description="支持 iPhone 录音、微信语音等多种格式，单个文件最大支持 2 小时。"
            />
            <StepCard
              number="2"
              title="AI 处理"
              description="自动转录音频并生成结构化纪要，包括摘要、决策、行动项等。"
            />
            <StepCard
              number="3"
              title="复制分享"
              description="一键复制 Markdown 格式纪要，或直接分享给团队成员。"
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">适用于各种场景</h2>
            <p className="text-lg text-slate-600">帮助您的团队更高效地管理会议</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <UseCaseCard
              title="产品团队"
              description="产品评审会、需求讨论会、Sprint 回顾会"
              items={[
                "自动记录产品决策",
                "追踪功能优先级",
                "生成 PRD 草稿"
              ]}
            />
            <UseCaseCard
              title="销售团队"
              description="客户拜访、商务洽谈、合同评审"
              items={[
                "记录客户需求",
                "跟进事项提醒",
                "同步 CRM 系统"
              ]}
            />
            <UseCaseCard
              title="管理层"
              description="战略会议、董事会、高管讨论"
              items={[
                "保密性保障",
                "关键决策归档",
                "行动项追踪"
              ]}
            />
            <UseCaseCard
              title="创业团队"
              description="日常站会、头脑风暴、融资路演"
              items={[
                "降低沟通成本",
                "知识沉淀",
                "快速迭代"
              ]}
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">简单透明的定价</h2>
            <p className="text-lg text-slate-600">选择适合您团队的方案</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <PricingCard
              name="免费版"
              price="¥0"
              period="永久免费"
              features={[
                "每月 60 分钟转录时长",
                "基础 AI 摘要",
                "最多 3 个会议",
                "社区支持"
              ]}
              cta="开始使用"
              onClick={() => navigate('/auth')}
            />
            <PricingCard
              name="专业版"
              price="¥299"
              period="/ 月"
              features={[
                "每月 600 分钟转录时长",
                "高级 AI 摘要",
                "无限会议数量",
                "多人协作",
                "自定义模板",
                "优先支持"
              ]}
              cta="开始试用"
              popular={true}
              onClick={() => navigate('/auth')}
            />
            <PricingCard
              name="企业版"
              price="定制"
              period="联系销售"
              features={[
                "不限转录时长",
                "专属 AI 模型",
                "私有部署",
                "SSO 单点登录",
                "API 接入",
                "专属客户经理"
              ]}
              cta="联系销售"
              onClick={() => window.open('mailto:sales@cantomeet.com')}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            准备好提升您的会议效率了吗？
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            加入数百家企业，让 AI 成为您的会议助手
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="bg-white hover:bg-slate-50 text-primary-700 px-8 py-4 rounded-xl font-bold text-lg shadow-xl flex items-center gap-2 transition-all hover:scale-105"
            >
              立即开始免费试用
              <ArrowRight size={20} />
            </button>
          </div>
          <p className="text-primary-100 text-sm mt-6">
            14 天免费试用 • 无需信用卡 • 随时取消
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                  M
                </div>
                <span className="text-white font-bold">CantoMeet Notes</span>
              </div>
              <p className="text-sm">
                为大湾区企业打造的
                <br />
                智能会议纪要工具
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">产品</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">功能特性</a></li>
                <li><a href="#pricing" className="hover:text-white">定价方案</a></li>
                <li><a href="#" className="hover:text-white">更新日志</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">资源</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">帮助文档</a></li>
                <li><a href="#" className="hover:text-white">API 文档</a></li>
                <li><a href="#" className="hover:text-white">博客</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">公司</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">关于我们</a></li>
                <li><a href="#" className="hover:text-white">联系我们</a></li>
                <li><a href="#" className="hover:text-white">隐私政策</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-sm text-center">
            © 2025 CantoMeet Notes. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

// Components
const StatItem = ({ number, label }: { number: string; label: string }) => (
  <div className="text-center">
    <div className="text-4xl font-bold text-slate-900 mb-2">{number}</div>
    <div className="text-sm text-slate-600">{label}</div>
  </div>
);

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color: string;
}) => {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50',
    yellow: 'bg-yellow-50',
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    pink: 'bg-pink-50',
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all">
      <div className={`w-14 h-14 ${colorMap[color]} rounded-xl flex items-center justify-center mb-6`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
};

const StepCard = ({ 
  number, 
  title, 
  description 
}: { 
  number: string; 
  title: string; 
  description: string;
}) => (
  <div className="relative">
    <div className="flex items-start gap-6">
      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
        {number}
      </div>
      <div className="flex-1 pt-2">
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

const UseCaseCard = ({ 
  title, 
  description, 
  items 
}: { 
  title: string; 
  description: string; 
  items: string[];
}) => (
  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
    <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 mb-6">{description}</p>
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-center gap-3 text-slate-700">
          <Check size={18} className="text-green-600 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const PricingCard = ({ 
  name, 
  price, 
  period, 
  features, 
  cta, 
  popular, 
  onClick 
}: { 
  name: string; 
  price: string; 
  period: string; 
  features: string[]; 
  cta: string; 
  popular?: boolean;
  onClick: () => void;
}) => (
  <div className={`relative bg-white p-8 rounded-2xl border-2 ${popular ? 'border-primary-600 shadow-xl' : 'border-slate-200 shadow-sm'}`}>
    {popular && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
        最受欢迎
      </div>
    )}
    <div className="mb-6">
      <h3 className="text-xl font-bold text-slate-900 mb-2">{name}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold text-slate-900">{price}</span>
        <span className="text-slate-600">{period}</span>
      </div>
    </div>
    <ul className="space-y-4 mb-8">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start gap-3 text-slate-700">
          <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{feature}</span>
        </li>
      ))}
    </ul>
    <button
      onClick={onClick}
      className={`w-full py-3 rounded-xl font-bold transition-all ${
        popular
          ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
      }`}
    >
      {cta}
    </button>
  </div>
);

