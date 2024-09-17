import React from "react";
import { Checkbox } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";

type SharedCheckboxProps<T> = React.PropsWithChildren<{
  allOptions: T[];
  checkedList: T[];
  onChecked: (checked: T[]) => void;
  onUnchecked: (unchecked: T[]) => void;
  style?: React.CSSProperties;
}>;

const SharedCheckbox = <T,>(props: SharedCheckboxProps<T>): React.ReactNode => {
  const onCheckAllChange = ({ target }: CheckboxChangeEvent): void => {
    const { allOptions, onChecked, onUnchecked } = props;
    target.checked ? onChecked(allOptions) : onUnchecked(allOptions);
  };

  const indeterminate = !!props.checkedList.length && props.checkedList.length < props.allOptions.length;
  const checkAll = props.checkedList.length === props.allOptions.length;

  return (
    <Checkbox indeterminate={indeterminate} onChange={onCheckAllChange} checked={checkAll} style={props.style}>
      {props.children}
    </Checkbox>
  );
};

export default SharedCheckbox;
