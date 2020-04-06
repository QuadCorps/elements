import { JSONSchema } from '@stoplight/prism-http';
import { HttpMethod, IHttpOperation, IHttpParam } from '@stoplight/types';
import { filter, flatten, get, has } from 'lodash';

import { RequestStore } from '../stores/request-maker/request';

const sampler = require('openapi-sampler');

export function getOperationData(operation: Partial<IHttpOperation>): Partial<RequestStore> {
  const queryParams = getParamsFromOperation(operation, 'query');
  const headerParams = getParamsFromOperation(operation, 'headers');
  let auth;

  for (const security of flatten(operation.security)) {
    const schema: JSONSchema = {
      type: 'string',
      description: security.description,
    };

    if (security.type === 'http' && security.scheme === 'bearer') {
      headerParams.push({
        name: 'authorization',
        value: 'Bearer',
        isEnabled: true,
        schema,
        required: true,
      });
    } else if (security.type === 'http' && security.scheme === 'basic') {
      auth = { username: '', password: '' };
    } else if ('in' in security) {
      const param = {
        name: security.name,
        value: '',
        isEnabled: true,
        schema,
        required: true,
      };

      if (security.in === 'query') {
        queryParams.push(param);
      } else if (security.in === 'header') {
        headerParams.push(param);
      }
    }
  }

  const body = getBodyFromOperation(operation);

  return {
    publicServers: operation.servers || [],
    publicBaseUrl: get(operation, 'servers[0].url', ''),
    method: (operation.method as HttpMethod) || 'get',
    templatedPath: operation.path || '',
    body,
    contentType: body ? 'raw' : 'none',
    pathParams: getParamsFromOperation(operation, 'path'),
    queryParams,
    headerParams,
    auth,
  };
}

function getParamsFromOperation(operation: Partial<IHttpOperation>, type: 'query' | 'path' | 'headers') {
  return filter(get(operation, `request.${type}`, []), (p) => get(p, 'name')).map((p: IHttpParam) => ({
    name: p.name,
    value: has(p.schema, 'default') ? String(get(p.schema, 'default')) : '',
    isEnabled: p.required || has(p.schema, 'default'),
    ...(p.required && { required: p.required }),
    ...(p.schema && { schema: p.schema }),
  }));
}

function getBodyFromOperation(operation: Partial<IHttpOperation>) {
  const schema = get(operation, 'request.body.contents[0].schema');

  if (schema) {
    return sampler.sample(schema);
  }

  return '';
}