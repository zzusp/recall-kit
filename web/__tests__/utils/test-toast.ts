// 简单的 Toast 测试脚本
// 在浏览器控制台中运行此脚本来测试 Toast 功能

// 模拟导入 toast 函数（在实际应用中，这会是正常的导入）
// import { toast } from '@/lib/toastService';

console.log('开始测试 Toast 功能...');

// 测试成功提示
if (typeof window !== 'undefined' && (window as any).toast) {
  console.log('测试成功提示...');
  (window as any).toast.success('这是一个成功提示！');
  
  setTimeout(() => {
    console.log('测试错误提示...');
    (window as any).toast.error('这是一个错误提示！');
  }, 2000);
  
  setTimeout(() => {
    console.log('测试警告提示...');
    (window as any).toast.warning('这是一个警告提示！');
  }, 4000);
  
  setTimeout(() => {
    console.log('测试信息提示...');
    (window as any).toast.info('这是一个信息提示！');
  }, 6000);
} else {
  console.error('Toast 函数未找到，请检查导入');
}

console.log('Toast 测试完成');