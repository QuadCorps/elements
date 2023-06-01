import { Box, Flex, Heading, HStack, InvertTheme, NodeAnnotation, useThemeIsDark, VStack } from '@stoplight/mosaic';
import { withErrorBoundary } from '@stoplight/react-error-boundary';
import { IHttpOperation } from '@stoplight/types';
import cn from 'classnames';
import { Request as HarRequest } from 'har-format';
import { useAtomValue } from 'jotai/utils';
import * as React from 'react';

import { HttpMethodColors } from '../../../constants';
import { MockingContext } from '../../../containers/MockingProvider';
import { useResolvedObject } from '../../../context/InlineRefResolver';
import { useOptionsCtx } from '../../../context/Options';
import { useChosenServerUrl } from '../../../hooks/useChosenServerUrl';
import { MarkdownViewer } from '../../MarkdownViewer';
import { RequestSamples } from '../../RequestSamples';
import { ResponseExamples } from '../../ResponseExamples/ResponseExamples';
import { chosenServerAtom, TryIt } from '../../TryIt';
import { DocsComponentProps } from '..';
import { TwoColumnLayout } from '../TwoColumnLayout';
import { DeprecatedBadge, InternalBadge } from './Badges';
import { Request } from './Request';
import { Responses } from './Responses';

export type HttpOperationProps = DocsComponentProps<IHttpOperation>;

const HttpOperationComponent = React.memo<HttpOperationProps>(
  ({ className, data: unresolvedData, layoutOptions, tryItCredentialsPolicy, tryItCorsProxy }) => {
    const { nodeHasChanged } = useOptionsCtx();
    const data = useResolvedObject(unresolvedData) as IHttpOperation;

    const mocking = React.useContext(MockingContext);
    const isDeprecated = !!data.deprecated;
    const isInternal = !!data.internal;

    const [responseMediaType, setResponseMediaType] = React.useState('');
    const [responseStatusCode, setResponseStatusCode] = React.useState('');
    const [requestBodyIndex, setTextRequestBodyIndex] = React.useState(0);

    const prettyName = (data.summary || data.iid || '').trim();
    const hasBadges = isDeprecated || isInternal;
    const descriptionChanged = nodeHasChanged?.({ nodeId: data.id, attr: 'description' });
    const [requestData, setRequestData] = React.useState<HarRequest | undefined>();
    const header = (
      <OperationHeader
        id={data.id}
        method={data.method}
        path={data.path}
        noHeading={layoutOptions?.noHeading}
        hasBadges={hasBadges}
        name={prettyName}
        isDeprecated={isDeprecated}
        isInternal={isInternal}
      />
    );

    const requestObj = <Request onChange={setTextRequestBodyIndex} operation={data} />;
    const tryItObj = (
      <InvertTheme>
        <Box>
          <TryIt
            httpOperation={data}
            mockUrl={mocking.hideMocking ? undefined : mocking.mockUrl}
            requestBodyIndex={requestBodyIndex}
            embeddedInMd={false}
            tryItCredentialsPolicy={tryItCredentialsPolicy}
            corsProxy={tryItCorsProxy}
            onRequestChange={setRequestData}
          />
        </Box>
      </InvertTheme>
    );
    const responseExamplesObj = (
      <ResponseExamples
        httpOperation={data}
        responseMediaType={responseMediaType}
        responseStatusCode={responseStatusCode}
      />
    );

    return (
      <VStack spacing={10}>
        {header}
        {data.description && (
          <Box pos="relative">
            <MarkdownViewer className="HttpOperation__Description" markdown={data.description} />
            <NodeAnnotation change={descriptionChanged} />
          </Box>
        )}
        <TwoColumnLayout
          className={cn('HttpOperation', className)}
          header={<></>}
          left={tryItObj}
          right={requestData && <RequestSamples request={requestData} />}
        />

        {requestObj}
        <TwoColumnLayout
          className={cn('HttpOperation', className)}
          header={<></>}
          left={
            data.responses && (
              <Responses
                responses={data.responses}
                onMediaTypeChange={setResponseMediaType}
                onStatusCodeChange={setResponseStatusCode}
              />
            )
          }
          right={responseExamplesObj}
        />
      </VStack>
    );
  },
);
HttpOperationComponent.displayName = 'HttpOperation.Component';

export const HttpOperation = withErrorBoundary<HttpOperationProps>(HttpOperationComponent, {
  recoverableProps: ['data'],
});

type MethodPathProps = { method: IHttpOperation['method']; path: string };

function MethodPath({ method, path }: MethodPathProps) {
  const chosenServer = useAtomValue(chosenServerAtom);

  let chosenServerUrl = '';
  if (chosenServer) {
    chosenServerUrl = chosenServer.url.endsWith('/') ? chosenServer.url.slice(0, -1) : chosenServer.url;
  }

  return (
    <Box>
      <MethodPathInner method={method} path={path} chosenServerUrl={chosenServerUrl} />
    </Box>
  );
}

function MethodPathInner({ method, path, chosenServerUrl }: MethodPathProps & { chosenServerUrl: string }) {
  const isDark = useThemeIsDark();
  const fullUrl = `${chosenServerUrl}${path}`;
  const { leading, trailing } = useChosenServerUrl(chosenServerUrl);

  const pathElem = (
    <Flex overflowX="hidden" fontSize="lg" userSelect="all">
      <Box dir="rtl" color="muted" textOverflow="truncate" overflowX="hidden">
        {leading}

        {trailing !== null && (
          <Box as="span" dir="ltr" style={{ unicodeBidi: 'bidi-override' }}>
            {trailing}
          </Box>
        )}
      </Box>

      <Box fontWeight="semibold" flex={1}>
        {path}
      </Box>
    </Flex>
  );

  return (
    <HStack
      spacing={3}
      pl={2.5}
      pr={4}
      py={2}
      bg="canvas-50"
      rounded="lg"
      fontFamily="mono"
      display="inline-flex"
      maxW="full"
      title={fullUrl}
    >
      <Box
        py={1}
        px={2.5}
        rounded="lg"
        bg={!isDark ? HttpMethodColors[method] : 'canvas-100'}
        color={!isDark ? 'on-primary' : 'body'}
        fontSize="lg"
        fontWeight="semibold"
        textTransform="uppercase"
      >
        {method}
      </Box>

      {pathElem}
    </HStack>
  );
}

function OperationHeader({
  id,
  noHeading,
  hasBadges,
  name,
  isDeprecated,
  isInternal,
  method,
  path,
}: {
  id: string;
  noHeading?: boolean;
  hasBadges: boolean;
  name: string;
  isDeprecated?: boolean;
  isInternal?: boolean;
  method: string;
  path: string;
}) {
  const { nodeHasChanged } = useOptionsCtx();

  if (noHeading && !hasBadges) {
    return null;
  }

  const lineOneChanged = nodeHasChanged?.({ nodeId: id, attr: ['iid', 'summary', 'deprecated', 'internal'] });
  const lineTwoChanged = nodeHasChanged?.({ nodeId: id, attr: ['method', 'path'] });

  return (
    <VStack spacing={5}>
      <Box pos="relative">
        <HStack spacing={5}>
          {!noHeading && name ? (
            <Heading size={1} fontWeight="semibold">
              {name}
            </Heading>
          ) : null}

          <HStack spacing={2}>
            {isDeprecated && <DeprecatedBadge />}
            {isInternal && <InternalBadge isHttpService />}
          </HStack>
        </HStack>
        <NodeAnnotation change={lineOneChanged} />
      </Box>

      <Box pos="relative">
        <MethodPath method={method} path={path} />
        <NodeAnnotation change={lineTwoChanged} />
      </Box>
    </VStack>
  );
}
