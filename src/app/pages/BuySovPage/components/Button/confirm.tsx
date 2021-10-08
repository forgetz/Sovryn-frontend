import React from 'react';
import styled, { css } from 'styled-components/macro';

interface BtnProps {
  onClick: () => void;
  disabled?: boolean;
}

interface Props extends BtnProps {
  text: React.ReactNode;
  className?: string;
}

const StyledButton = styled.button`
  height: 50px;
  width: 100%;
  margin-top: 40px;
  border: 1px solid var(--primary);
  color: var(--black);
  padding: 11px;
  font-size: 1.25rem;
  font-weight: 900;
  background: var(--primary-25);
  border-radius: 0.75rem;
  text-transform: none;
  line-height: 1;
  transition: background 0.3s;
  text-transform: uppercase;

  &:hover {
    background: var(--primary-50);
  }

  ${(props: BtnProps) =>
    props.disabled &&
    css`
      opacity: 25%;
    `}
`;

export function ConfirmButton(props: Props) {
  return (
    <StyledButton
      onClick={props.onClick}
      disabled={props.disabled}
      className={props.className}
    >
      {props.text}
    </StyledButton>
  );
}
