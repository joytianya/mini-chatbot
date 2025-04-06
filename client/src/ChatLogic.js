/**
 * @fileoverview 聊天逻辑的入口文件
 * 注意：此文件已被拆分为多个模块化文件，为了保持向后兼容性而保留。
 * 推荐直接从对应的模块导入所需功能。
 */

// 导入和重新导出所有功能
import useChatLogic from './hooks/useChatLogic';
export default useChatLogic;

// 导出各个模块
export * from './utils/sessionUtils';
export * from './utils/messageUtils';
export * from './hooks'; 