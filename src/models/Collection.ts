export interface PostmanRequest {
  name: string;
  request: {
    method: string;
    header: Array<{ key: string; value: string }>;
    url: {
      raw: string;
      host: string[];
      path: string[];
      query?: Array<{ key: string; value: string }>;
    };
    body?: {
      mode: 'raw';
      raw: string;
    };
  };
  response?: any[];
}

export interface PostmanCollection {
  info: {
    name: string;
    schema: string;
  };
  item: PostmanRequest[];
}
