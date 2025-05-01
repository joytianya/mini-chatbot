import { useState, useCallback, ChangeEvent } from 'react';
import { maskSensitiveInfo, unmaskSensitiveInfo, getSensitiveInfoMap, clearSensitiveInfoMap } from '../utils/SensitiveInfoMasker';

// --- Type Definitions ---
type SensitiveMap = Record<string, string>;

interface SensitiveInfoDemoProps {
  // darkMode removed
}

// Default demo text
const defaultDemoText = `个人简历
姓名：张三
联系电话：18872627220
求职意向
游戏策划师
教育背景
时间：2024.9-2025.6
学校名称：吉林大学
专业名称：计算机应用 本科
工作经验
时间：2022.5-2024.6
公司名称：腾讯有限公司
职位名称：资源游戏策划 策划部
·       确定游戏核心玩法，游戏风格，规划游戏的整体大架构，制定整体工作进度表，监督和配程序，美术进行开发。
·       编写游戏的各个系统模块，同序程序，保证开发进度，保证美术需求，设计每个系统模块的界面原型，指导，配合美术完成界面UI和人物，场景原画。
·       配合运营，对运营活动进行设计，分析游戏消费点，规划玩家前期，中期，后期消费线。
·       设计游戏的整个数值模型（包括经济系统，人物属性，经验系统等）根据测试反馈，进行相应修改和调整。
·       编写游戏的整个剧情和所有文字描述，联系音乐和美工的外包，根据运营反馈进行游戏的调优。
时间：2020.8-2021.6
公司名称：快手有限公司
职位名称：游戏策划 策划部
·       游戏策划：任务系统的设讨与维护，并应时制宜的改善任务交互玩法等；角色装备及强化系统的制作；落实并试策划案文档的功能实现；协助程序和美术在游戏中功能的实现与验收等。
·       文案策划：构建游戏世界观，编剧游戏剧情和人物旁白内容等。
·       场景策划：维护游戏大世界、副本的场景，并根据策划需求自行设计并制作场景资源。
·       产品经理：构建产品原型；拟定运营计划；设计界面交互；验收日常测试和优化版本调试等。
·       美工设计：制作输出对应项目组所需的icon资源及banner展示资源等。
·       产品运营：维护在营项目及产品的日常运行等。
技能特长
MS Office-熟练    产品经理-熟练    游戏策划-熟练    文案策划-熟练    计算机应用-熟练    cet-4-熟练
兴趣爱好
花草    绘画    瑜伽    骑行    篮球    旅游
自我评价
证书/执照：计算机等级证书（Office使用），普通话等级证书二级甲等，教师资格证（高中） 语言：英语CET-6（能熟练阅读英文文档，准备英文版教案）`;

// --- Component ---
export function SensitiveInfoDemo({}: SensitiveInfoDemoProps): JSX.Element {
  const [originalText, setOriginalText] = useState<string>(defaultDemoText);
  const [maskedText, setMaskedText] = useState<string>('');
  const [sensitiveMap, setSensitiveMap] = useState<SensitiveMap>({});
  const [showMap, setShowMap] = useState<boolean>(false);

  const handleMask = useCallback(() => {
    console.log('Masking demo text...');
    clearSensitiveInfoMap(); // Clear global state if masker relies on it
    const masked = maskSensitiveInfo(originalText);
    const newMap = getSensitiveInfoMap();
    setMaskedText(masked);
    setSensitiveMap(newMap);
    setShowMap(false); // Hide map after masking
    console.log('Masking complete, map size:', Object.keys(newMap).length);
  }, [originalText]);

  const handleUnmask = useCallback(() => {
    if (!maskedText) {
      console.log('No masked text to unmask.');
      return; // Or show a toast
    }
    if (Object.keys(sensitiveMap).length === 0) {
       console.log('Sensitive map is empty, cannot unmask.');
       return; // Or show a toast
    }
    console.log('Unmasking demo text...');
    try {
        const unmasked = unmaskSensitiveInfo(maskedText, sensitiveMap);
        // We set the *originalText* state back to the unmasked result
        // This might be confusing UX, consider if you just want to *display* it
        setOriginalText(unmasked); // Set original text to the unmasked version
        // Clear masked text after unmasking to show the result clearly in original area
        setMaskedText('');
        console.log('Unmasking successful.');
    } catch (error: any) {
        console.error("Error during unmasking:", error);
        // Show error to user, e.g., using toast
    }
  }, [maskedText, sensitiveMap]);

  const handleOriginalTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
     setOriginalText(e.target.value);
     // Optionally clear masked text when original changes?
     // setMaskedText('');
     // setSensitiveMap({});
  }, []);

   const handleMaskedTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
     setMaskedText(e.target.value);
     // Unmasking usually relies on the specific map generated during masking.
     // Allowing edits here might break the unmask functionality unless the map is updated.
     // Consider making the masked textarea read-only if direct editing isn't intended.
   }, []);

  const handleToggleMap = useCallback(() => {
    setShowMap(prev => !prev);
  }, []);

  // Tailwind classes
  const containerClasses = "p-5 bg-white dark:bg-gray-800 rounded-lg shadow mb-5";
  const titleClasses = "text-xl font-semibold mb-4 text-gray-900 dark:text-white";
  const sectionTitleClasses = "text-lg font-medium mb-2 text-gray-800 dark:text-gray-200";
  const textareaClasses = "w-full h-72 p-3 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const buttonClasses = "px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
  const primaryButtonClasses = `${buttonClasses} bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500`;
  const successButtonClasses = `${buttonClasses} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`;
  const secondaryButtonClasses = `${buttonClasses} bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 focus:ring-gray-500`;
  const mapContainerClasses = "mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md max-h-52 overflow-y-auto";
  const tableClasses = "w-full border-collapse text-sm text-gray-800 dark:text-gray-200";
  const thClasses = "text-left p-2 border-b border-gray-300 dark:border-gray-600 font-medium bg-gray-200 dark:bg-gray-600";
  const tdClasses = "p-2 border-b border-gray-200 dark:border-gray-700 font-mono";

  return (
    <div className={containerClasses}>
      <h2 className={titleClasses}>敏感信息保护演示</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Original Text Area */}
        <div>
          <h3 className={sectionTitleClasses}>原始文本</h3>
          <textarea
            value={originalText}
            onChange={handleOriginalTextChange}
            className={textareaClasses}
            aria-label="原始文本输入框"
          />
        </div>

        {/* Masked Text Area */}
        <div>
          <h3 className={sectionTitleClasses}>掩码后文本</h3>
          <textarea
            value={maskedText}
            onChange={handleMaskedTextChange}
            className={textareaClasses}
            aria-label="掩码后文本显示框"
            placeholder="点击'掩码敏感信息'按钮生成"
            // readOnly // Consider making this read-only if direct editing isn't intended
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-5">
        <button onClick={handleMask} className={primaryButtonClasses}>
          掩码敏感信息
        </button>
        <button onClick={handleUnmask} className={successButtonClasses} disabled={!maskedText || Object.keys(sensitiveMap).length === 0}>
          恢复原始信息 (覆盖上方)
        </button>
        <button onClick={handleToggleMap} className={secondaryButtonClasses}>
          {showMap ? '隐藏' : '显示'}映射表 ({Object.keys(sensitiveMap).length})
        </button>
      </div>

      {/* Sensitive Info Map (Conditional) */}
      {showMap && (
        <div>
          <h3 className={sectionTitleClasses}>敏感信息映射表</h3>
          <div className={mapContainerClasses}>
            {Object.keys(sensitiveMap).length > 0 ? (
               <table className={tableClasses}>
                <thead>
                  <tr>
                    <th className={thClasses}>掩码值</th>
                    <th className={thClasses}>原始值</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(sensitiveMap).map(([masked, original], index) => (
                    <tr key={masked + index}> {/* Use a more stable key if possible */}
                      <td className={tdClasses}>{masked}</td>
                      <td className={tdClasses}>{original}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
               <p className="text-sm text-gray-500 dark:text-gray-400 italic">映射表为空。</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Add default export to match import in Chat.jsx
export default SensitiveInfoDemo;