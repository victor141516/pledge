import request from "supertest";
import express from "express";
import { describe, expect, it, vi } from "vitest";
import { pledgeMiddleware } from "../../src/server/adapters/express";

describe("Express client disconnect handling", () => {
  it("should handle client disconnect", async () => {
    const app = express();
    app.use(pledgeMiddleware);

    let promiseResolve: (value: any) => void;
    const longRunningPromise = new Promise((resolve) => {
      promiseResolve = resolve;
    });

    app.get("/test", (req, res) => {
      res.sendPledge({
        immediate: "available now",
        delayed: longRunningPromise,
      });
    });

    const server = app.listen();
    
    try {
      // Start the request but don't wait for completion
      const requestPromise = request(server)
        .get("/test")
        .timeout(100) // Short timeout to simulate disconnect
        .expect(() => {
          // This should timeout/abort
        });

      await expect(requestPromise).rejects.toThrow();
      
      // Resolve the promise after the request has been aborted
      promiseResolve!("delayed value");
      
      // Give some time for cleanup
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } finally {
      server.close();
    }
  });

  it("should handle client disconnect gracefully", async () => {
    const app = express();
    app.use(pledgeMiddleware);
    
    app.get("/test", (req, res) => {
      res.sendPledge({
        immediate: "available now",
        delayed: new Promise(resolve => setTimeout(() => resolve("delayed value"), 1000)),
      });
    });

    const server = app.listen();
    
    try {
      // Start the request and let it timeout to simulate client disconnect
      const requestPromise = request(server)
        .get("/test")
        .timeout(100); // Short timeout simulates client disconnect

      await expect(requestPromise).rejects.toThrow();
      
    } finally {
      server.close();
    }
  });

  it("should clean up resources on connection close", async () => {
    const app = express();
    app.use(pledgeMiddleware);

    const cleanupSpy = vi.fn();
    
    app.get("/test", (req, res) => {
      // Mock cleanup by listening to request close
      req.on('close', cleanupSpy);
      req.on('aborted', cleanupSpy);
      
      res.sendPledge({
        immediate: "available now",
        delayed: new Promise(resolve => setTimeout(() => resolve("delayed value"), 1000)),
      });
    });

    const server = app.listen();
    
    try {
      // Start request and immediately abort
      const requestPromise = request(server)
        .get("/test")
        .timeout(50);

      await expect(requestPromise).rejects.toThrow();
      
      // Give some time for event handlers to fire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(cleanupSpy).toHaveBeenCalled();
      
    } finally {
      server.close();
    }
  });
});
