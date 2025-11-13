export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Font Awesome 图标测试</h1>
      
      <div className="space-y-4">
        <div>
          <i className="fas fa-brain text-2xl text-blue-600 mr-2"></i>
          <span>fa-brain 图标</span>
        </div>
        
        <div>
          <i className="fas fa-search text-2xl text-green-600 mr-2"></i>
          <span>fa-search 图标</span>
        </div>
        
        <div>
          <i className="fas fa-book-open text-2xl text-red-600 mr-2"></i>
          <span>fa-book-open 图标</span>
        </div>
        
        <div>
          <i className="fas fa-tags text-2xl text-purple-600 mr-2"></i>
          <span>fa-tags 图标</span>
        </div>
        
        <div>
          <i className="fas fa-bug text-2xl text-orange-600 mr-2"></i>
          <span>fa-bug 图标</span>
        </div>
      </div>
    </div>
  );
}