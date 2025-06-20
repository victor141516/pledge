declare global {
    namespace Express {
        interface Response {
            sendPledge(data: any): Promise<void>;
        }
    }
}
export declare function pledgeMiddleware(_: unknown, res: any, next: () => void): void;
//# sourceMappingURL=express.d.ts.map