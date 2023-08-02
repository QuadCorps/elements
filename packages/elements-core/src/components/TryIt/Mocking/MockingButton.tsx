import { Box, FieldButton, Menu, MenuItems, MenuItemWithSubmenu } from '@stoplight/mosaic';
import { IHttpOperation, IHttpOperationResponse } from '@stoplight/types';
import * as React from 'react';

import { MockingOptions } from './mocking-utils';

interface MockingButtonProps {
  operation: IHttpOperation;
  options: MockingOptions;
  onOptionsChange: (data: MockingOptions) => void;
}

export const MockingButton: React.FC<MockingButtonProps> = ({ operation, options: { code }, onOptionsChange }) => {
  const operationResponses = operation.responses;

  const setMockingOptions = React.useCallback(
    ({ code, example, dynamic }: Omit<MockingOptions, 'isEnabled'>) => {
      onOptionsChange({ code, example, dynamic });
    },
    [onOptionsChange],
  );

  const menuItems = React.useMemo(() => {
    const items: MenuItems = operationResponses
      ?.filter(operationResponse => Number.isInteger(parseFloat(operationResponse.code)))
      ?.map(generateOperationResponseMenu);

    function generateOperationResponseMenu(operationResponse: IHttpOperationResponse) {
      const menuId = `response-${operationResponse.code}`;
      const isActive = operationResponse.code === code;

      const menuItem: MenuItemWithSubmenu = {
        id: menuId,
        isChecked: isActive,
        title: operationResponse.code,
        onPress: () => {
          setMockingOptions({ code: operationResponse.code, dynamic: false });
        },
        children: [],
      };

      return menuItem;
    }

    return items;
  }, [code, operationResponses, setMockingOptions]);

  if (menuItems.length > 0) {
    return (
      <Box>
        <Menu
          aria-label="Mock settings"
          items={menuItems}
          renderTrigger={({ isOpen }) => (
            <FieldButton active={isOpen} size="sm">
              Mock Settings
            </FieldButton>
          )}
        />
      </Box>
    );
  } else {
    return null;
  }
};
