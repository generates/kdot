import { requester } from '@ianwalter/requester'

requester.get('http://localhost:8999/kdot-port-reverse')
  .then(res => console.log(res.body))
