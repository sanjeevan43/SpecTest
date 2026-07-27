import { AIService } from './AIService';
import type { ApiEndpoint, ParsedApiDocument } from '../types';

export class WorkflowGenerator {
  /**
   * Sorts endpoints using AI-inferred execution order if available, falling back to original sorting.
   */
  public static async sortEndpointsWithAI(
    endpoints: ApiEndpoint[],
    document: ParsedApiDocument
  ): Promise<ApiEndpoint[]> {
    try {
      const inference = await AIService.infer(document);
      if (!inference || !inference.executionOrder || inference.executionOrder.length === 0) {
        return endpoints;
      }

      const orderMap = new Map<string, number>();
      inference.executionOrder.forEach((id, index) => {
        orderMap.set(id, index);
      });

      const sorted = [...endpoints];
      return sorted.sort((a, b) => {
        const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
        const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
        return indexA - indexB;
      });
    } catch (e) {
      console.warn('[AI Workflow Generator] AI sorting failed. Falling back to deterministic order.', e);
      return endpoints;
    }
  }
}
