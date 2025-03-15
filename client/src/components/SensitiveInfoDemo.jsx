import React, { useState } from 'react';
import { maskSensitiveInfo, unmaskSensitiveInfo, getSensitiveInfoMap, clearSensitiveInfoMap } from '../utils/SensitiveInfoMasker';

const SensitiveInfoDemo = ({ darkMode }) => {
  const [originalText, setOriginalText] = useState(
    `个人简历
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
证书/执照：计算机等级证书（Office使用），普通话等级证书二级甲等，教师资格证（高中） 语言：英语CET-6（能熟练阅读英文文档，准备英文版教案）`
  );
  const [maskedText, setMaskedText] = useState('');
  const [sensitiveMap, setSensitiveMap] = useState({});
  const [showMap, setShowMap] = useState(false);

  const handleMask = () => {
    clearSensitiveInfoMap();
    const masked = maskSensitiveInfo(originalText);
    setMaskedText(masked);
    setSensitiveMap(getSensitiveInfoMap());
  };

  const handleUnmask = () => {
    const unmasked = unmaskSensitiveInfo(maskedText);
    setOriginalText(unmasked);
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: darkMode ? '#2d2d2d' : '#fff',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h2 style={{ 
        color: darkMode ? '#fff' : '#333',
        marginTop: 0
      }}>敏感信息保护演示</h2>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: darkMode ? '#fff' : '#333' }}>原始文本</h3>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            style={{
              width: '100%',
              height: '300px',
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
              backgroundColor: darkMode ? '#3d3d3d' : '#f9f9f9',
              color: darkMode ? '#fff' : '#333',
              resize: 'none',
              fontFamily: 'monospace'
            }}
          />
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ color: darkMode ? '#fff' : '#333' }}>掩码后文本</h3>
          <textarea
            value={maskedText}
            onChange={(e) => setMaskedText(e.target.value)}
            style={{
              width: '100%',
              height: '300px',
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
              backgroundColor: darkMode ? '#3d3d3d' : '#f9f9f9',
              color: darkMode ? '#fff' : '#333',
              resize: 'none',
              fontFamily: 'monospace'
            }}
          />
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={handleMask}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          掩码敏感信息
        </button>
        
        <button
          onClick={handleUnmask}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4caf50',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          恢复原始信息
        </button>
        
        <button
          onClick={() => setShowMap(!showMap)}
          style={{
            padding: '8px 16px',
            backgroundColor: darkMode ? '#555' : '#f0f0f0',
            color: darkMode ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showMap ? '隐藏映射表' : '显示映射表'}
        </button>
      </div>
      
      {showMap && (
        <div>
          <h3 style={{ color: darkMode ? '#fff' : '#333' }}>敏感信息映射表</h3>
          <div style={{
            backgroundColor: darkMode ? '#3d3d3d' : '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              color: darkMode ? '#fff' : '#333',
              fontSize: '14px'
            }}>
              <thead>
                <tr>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '8px', 
                    borderBottom: `1px solid ${darkMode ? '#555' : '#ddd'}`
                  }}>掩码值</th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '8px', 
                    borderBottom: `1px solid ${darkMode ? '#555' : '#ddd'}`
                  }}>原始值</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(sensitiveMap).map(([masked, original], index) => (
                  <tr key={index}>
                    <td style={{ 
                      padding: '8px', 
                      borderBottom: `1px solid ${darkMode ? '#444' : '#eee'}`
                    }}>{masked}</td>
                    <td style={{ 
                      padding: '8px', 
                      borderBottom: `1px solid ${darkMode ? '#444' : '#eee'}`
                    }}>{original}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensitiveInfoDemo; 