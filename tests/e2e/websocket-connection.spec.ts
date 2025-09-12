import { test, expect } from '@playwright/test';

test.describe('WebSocket Connection Tests', () => {
  test('should connect to room server WebSocket directly', async ({ page }) => {
    // Log the user agent being used
    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log(`[DEBUG] Test User-Agent: ${userAgent}`);
    
    // Test direct WebSocket connection using JavaScript with Firefox IP fix
    const result = await page.evaluate(async () => {
      return new Promise((resolve) => {
        // Use IP address for all browsers for consistency
        const wsUrl = 'ws://192.168.178.61:1234/test-room';
        
        console.log(`[DEBUG] Using WebSocket URL: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        const errors = [];
        const messages = [];
        let connectionDetails = null;
        
        ws.onopen = () => {
          messages.push('Connected to room server');
          connectionDetails = {
            readyState: ws.readyState,
            protocol: ws.protocol,
            extensions: ws.extensions,
            url: ws.url
          };
        };
        
        ws.onmessage = (event) => {
          messages.push(`Received message: ${event.data}`);
          // For Yjs WebSocket connections, any message (including binary) indicates successful connection
          // Close the connection after receiving any message to complete the test
          ws.close();
          resolve({ success: true, messages, errors, connectionDetails });
        };
        
        ws.onerror = (error) => {
          errors.push('WebSocket error: ' + error.toString());
          resolve({ success: false, messages, errors, connectionDetails });
        };
        
        ws.onclose = (event) => {
          messages.push(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
          if (event.code !== 1000) {
            errors.push(`WebSocket closed with code: ${event.code}`);
          }
          // Only resolve here if we haven't already resolved in onmessage
          if (!connectionDetails) {
            resolve({ success: false, messages, errors, connectionDetails });
          } else {
            resolve({ success: true, messages, errors, connectionDetails });
          }
        };
        
        // Timeout after 15 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
            errors.push('WebSocket connection timeout');
            ws.close();
            resolve({ success: false, messages, errors, connectionDetails });
          }
        }, 15000);
      });
    });
    
    console.log('Direct room WebSocket test result:', result);
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('should connect to dice server WebSocket directly', async ({ page }) => {
    // Test direct WebSocket connection using JavaScript with Firefox IP fix
    const result = await page.evaluate(async () => {
      return new Promise((resolve) => {
        // Use IP address for all browsers for consistency
        const wsUrl = 'ws://192.168.178.61:1235/?room=test-room';
        
        console.log(`[DEBUG] Using dice WebSocket URL: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        const errors = [];
        const messages = [];
        
        ws.onopen = () => {
          messages.push('Connected to dice server');
          ws.close();
          resolve({ success: true, messages, errors });
        };
        
        ws.onerror = (error) => {
          errors.push('WebSocket error: ' + error.toString());
          resolve({ success: false, messages, errors });
        };
        
        ws.onclose = (event) => {
          if (event.code !== 1000) {
            errors.push(`WebSocket closed with code: ${event.code}`);
          }
          resolve({ success: true, messages, errors });
        };
        
        // Timeout after 10 seconds
        setTimeout(() => {
          errors.push('WebSocket connection timeout');
          resolve({ success: false, messages, errors });
        }, 10000);
      });
    });
    
    console.log('Direct dice WebSocket test result:', result);
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  });

});
