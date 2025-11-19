# SSE 客户端错误处理最佳实践

## 问题描述

当使用 SSE (Server-Sent Events) 连接到 MCP 服务器时，如果 API 密钥无效，服务器会拒绝连接，但客户端可能会一直显示 loading 状态，用户体验不佳。

## 服务器端优化

我们已经优化了服务器端的错误处理，现在会返回结构化的错误响应：

### 错误响应格式

```json
{
  "error": {
    "code": "API_KEY_MISSING | API_KEY_INVALID | SERVER_ERROR",
    "message": "详细的错误描述",
    "type": "authentication_error | server_error",
    "details": "额外的错误详情（可选）"
  }
}
```

### HTTP 头信息

- `Content-Type: application/json`
- `X-Error-Type: api_key_missing | api_key_invalid | server_error`

## 客户端处理建议

### 1. 使用 EventSource 的正确方式

```javascript
class MCPSSEClient {
  constructor(serverUrl, apiKey) {
    this.serverUrl = serverUrl;
    this.apiKey = apiKey;
    this.eventSource = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  async connect() {
    try {
      // 首先验证 API 密钥
      await this.validateApiKey();
      
      // API 密钥有效，建立 SSE 连接
      this.eventSource = new EventSource(`${this.serverUrl}/sse?api_key=${this.apiKey}`);
      
      this.eventSource.onopen = () => {
        console.log('SSE 连接已建立');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onConnectionEstablished();
      };

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE 连接错误:', error);
        this.isConnected = false;
        this.handleConnectionError(error);
      };

    } catch (error) {
      console.error('连接失败:', error);
      this.onConnectionFailed(error);
    }
  }

  async validateApiKey() {
    try {
      const response = await fetch(`${this.serverUrl}/sse?api_key=${this.apiKey}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API 密钥验证失败');
      }
      
      // 如果到这里说明 API 密钥有效，关闭这个请求（因为我们只是验证）
      return true;
    } catch (error) {
      throw new Error(`API 密钥验证失败: ${error.message}`);
    }
  }

  handleConnectionError(error) {
    // 检查是否是认证错误
    if (error.target && error.target.readyState === EventSource.CLOSED) {
      // 连接被关闭，可能是认证失败
      this.onAuthenticationFailed();
    } else {
      // 其他类型的错误，尝试重连
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
      } else {
        this.onConnectionFailed(new Error('连接失败，已达到最大重试次数'));
      }
    }
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      this.onMessage(data);
    } catch (error) {
      console.error('解析消息失败:', error);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }

  // 回调方法，由客户端实现
  onConnectionEstablished() {
    console.log('连接已建立回调');
  }

  onAuthenticationFailed() {
    console.error('认证失败回调');
  }

  onConnectionFailed(error) {
    console.error('连接失败回调:', error);
  }

  onMessage(data) {
    console.log('收到消息回调:', data);
  }
}

// 使用示例
const client = new MCPSSEClient('http://localhost:3001', 'your-api-key');

client.onConnectionEstablished = () => {
  console.log('✅ 连接成功！');
  // 隐藏 loading 状态，显示正常界面
};

client.onAuthenticationFailed = () => {
  console.error('❌ API 密钥无效或已过期');
  // 显示错误信息，停止 loading
  alert('API 密钥无效，请检查密钥是否正确');
};

client.onConnectionFailed = (error) => {
  console.error('❌ 连接失败:', error.message);
  // 显示错误信息，停止 loading
  alert(`连接失败: ${error.message}`);
};

// 开始连接
client.connect();
```

### 2. React 组件示例

```jsx
import React, { useState, useEffect } from 'react';

const MCPSSEComponent = ({ serverUrl, apiKey }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventSource, setEventSource] = useState(null);

  useEffect(() => {
    const connect = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 首先验证 API 密钥
        const validationResponse = await fetch(`${serverUrl}/sse?api_key=${apiKey}`);
        
        if (!validationResponse.ok) {
          const errorData = await validationResponse.json();
          throw new Error(errorData.error?.message || 'API 密钥验证失败');
        }

        // API 密钥有效，建立 SSE 连接
        const es = new EventSource(`${serverUrl}/sse?api_key=${apiKey}`);
        
        es.onopen = () => {
          setIsConnected(true);
          setIsLoading(false);
          console.log('SSE 连接已建立');
        };

        es.onmessage = (event) => {
          console.log('收到消息:', event.data);
          // 处理消息
        };

        es.onerror = (error) => {
          setIsConnected(false);
          setIsLoading(false);
          
          if (es.readyState === EventSource.CLOSED) {
            setError('API 密钥无效或连接被拒绝');
          } else {
            setError('连接发生错误');
          }
          
          es.close();
        };

        setEventSource(es);

      } catch (error) {
        setIsLoading(false);
        setError(error.message);
      }
    };

    if (apiKey) {
      connect();
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [serverUrl, apiKey]);

  if (isLoading) {
    return (
      <div className="loading">
        <div>正在连接到 MCP 服务器...</div>
        <div>请稍候...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h3>连接错误</h3>
        <p>{error}</p>
        <p>请检查 API 密钥是否正确，或联系管理员。</p>
        <button onClick={() => window.location.reload()}>
          重试
        </button>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="connected">
        <h3>✅ 已连接到 MCP 服务器</h3>
        {/* 正常的组件内容 */}
      </div>
    );
  }

  return null;
};

export default MCPSSEComponent;
```

## 关键点总结

1. **预验证 API 密钥**：在建立 SSE 连接前，先通过普通的 HTTP 请求验证 API 密钥
2. **结构化错误处理**：服务器返回 JSON 格式的错误信息，客户端可以解析并显示具体的错误
3. **状态管理**：明确区分 loading、connected、error 三种状态
4. **用户体验**：提供清晰的错误提示和重试机制
5. **资源清理**：在组件卸载时正确关闭 EventSource 连接

## 测试建议

测试以下场景：
- 有效的 API 密钥
- 缺失的 API 密钥
- 无效的 API 密钥
- 网络连接错误
- 服务器不可用

这样可以确保客户端能够正确处理各种错误情况，提供良好的用户体验。
