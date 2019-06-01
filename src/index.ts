import express from 'express'
import { dataSourceRoute } from 'falcor-express'
import FalcorRouter from './falcor';


const PORT = process.env.PORT || 3000

express()
  .use('/model.json', dataSourceRoute(FalcorRouter))
  .listen(PORT, () => console.log(`listening on port ${PORT}`))
