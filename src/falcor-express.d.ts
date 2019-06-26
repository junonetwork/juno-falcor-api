declare module 'falcor-express' {
  import { Request, Response, Handler } from 'express';
  import { DataSource } from 'falcor-router';

  export function dataSourceRoute(getDataSource: (req: Request, res: Response) => DataSource): Handler;
}
