import React, { ReactElement } from "react";
import styled, { css } from "styled-components";

// Adapted from "CSS-only middle truncation with ellipsis"
// by Mark Chitty https://codepen.io/markchitty/pen/RNZbRE

type TruncatedTextProps = {
  text: string;
  /** Minimum characters to show at the start of the text. */
  startCharacters?: number;
  /** Minimum characters to show at the end of the text. Hidden by start characters if the container does not
   * have enough space.
   */
  endCharacters?: number;
};

const defaultProps: Partial<TruncatedTextProps> = {
  startCharacters: 3,
  endCharacters: 40,
};

const TruncatedTextContainer = styled.div<{ $startChars: number; $endChars: number }>`
  display: flex;
  flex-direction: row;
  vertical-align: bottom;
  white-space: nowrap;
  /* overflow: hidden; */

  ${(props) => {
    const fudgeFactor = 0.4;
    return css`
      --startWidth: calc(1em * ${props.$startChars + 3} * ${fudgeFactor});
      --endWidth: calc(1em * ${props.$endChars} * ${fudgeFactor});

      & span {
        display: inline-block;
        vertical-align: bottom;
        white-space: nowrap;
        overflow: hidden;
      }

      & span:first-child {
        max-width: calc(100% - var(--endWidth));
        min-width: var(--startWidth);
        text-overflow: ellipsis;
        overflow: hidden;
        background: rgba(0, 120, 0, 0.2);
      }

      & span:last-child {
        max-width: calc(100% - var(--startWidth));
        direction: rtl;
        background: rgba(0, 0, 120, 0.2);
        z-index: 800;
      }
    `;
  }}
`;

/**
 * Renders text that will be truncated with ellipses in the middle of the text if there isn't
 * enough space to show the full text. The start and end characters counts are prioritized.
 */
export default function TruncatedText(inputProps: TruncatedTextProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<TruncatedTextProps>;

  // Split text into start and end characters.
  let startChars = Math.max(0, props.startCharacters);
  let endChars = Math.max(0, props.endCharacters);
  if (props.text.length <= startChars + endChars) {
    endChars = props.text.length - startChars;
  }

  const splitIndex = Math.max(0, props.text.length - endChars);
  const startText = props.text.slice(0, splitIndex);
  const endText = props.text.slice(splitIndex);

  // TODO: Text characters in endText can be partially clipped. Is there a way to prevent this from happening?
  return (
    <TruncatedTextContainer $startChars={startChars} $endChars={endChars} aria-label={props.text} title={props.text}>
      <span>{startText}</span>
      <span>{endText}</span>
    </TruncatedTextContainer>
  );
}
