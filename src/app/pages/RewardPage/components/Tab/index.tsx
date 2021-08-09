import { Text } from '@blueprintjs/core';
import React from 'react';
import styled, { css } from 'styled-components/macro';

interface Props {
  text: string;
  amount: string;
  active: boolean;
  onClick: () => void;
}

export function Tab(props: Props) {
  return (
    <StyledTab active={props.active} onClick={() => props.onClick()}>
      <TopTitle>
        <Text>{props.text}</Text>
      </TopTitle>
      <AmountTitle>
        <Text>{props.amount}</Text>
      </AmountTitle>
    </StyledTab>
  );
}

interface StyledProps {
  active: boolean;
}
const TopTitle = styled.div`
  color: '#E9EAE9';
  font-size: 16px;
`;
const AmountTitle = styled.div`
  color: '#E9EAE9';
  font-size: 24px;
  font-weight: bold;
`;
const StyledTab = styled.button.attrs(_ => ({
  type: 'button',
  className: 'btn',
}))`
  color: var(--light-gray);
  padding: 5px 10px;
  background: transparent;
  font-size: 18px;
  font-weight: 100;
  font-family: Montserrat;
  text-transform: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80px;
  width: 100%;
  background-color: rgba(34, 34, 34, 0.5);
  &:hover {
    color: var(--LightGrey);
  }
  ${(props: StyledProps) =>
    props.active &&
    css`
      font-weight: 400;
      background-color: rgba(34, 34, 34, 1);
      &:hover {
        color: var(--white);
      }
    `}
`;
