import styled from 'styled-components';

interface IStyledCardRowProps {
  leftColor?: string;
}

export const StyledCardRow = styled.div<IStyledCardRowProps>`
  background-color: var(--sov-white);
  display: flex;
  align-items: center;
  border-radius: 0.5rem;
  padding-right: 10px;
  border-left-width: 10px;
  border-left-color: ${props => `${props.leftColor || '#222222'}`};
`;
