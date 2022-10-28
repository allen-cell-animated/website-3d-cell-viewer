import React from "react";
import { Checkbox } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";

type SharedCheckboxProps<T> = React.PropsWithChildren<{
  allOptions: T[];
  checkedList: T[];
  onChecked: (checked: T[]) => void;
  onUnchecked: (unchecked: T[]) => void;
}>;

type SharedCheckboxState<T> = {
  checkedList: T[];
  indeterminate: boolean;
  checkAll: boolean;
};

export default class SharedCheckbox<T> extends React.Component<SharedCheckboxProps<T>, SharedCheckboxState<T>> {
  constructor(props: SharedCheckboxProps<T>) {
    super(props);
    this.onCheckAllChange = this.onCheckAllChange.bind(this);
    this.state = {
      checkedList: props.checkedList,
      indeterminate: true,
      checkAll: false,
    };
  }

  // TODO: Is this component's derived state strictly necessary? Can some or all of it be removed?
  static getDerivedStateFromProps<T>(newProps: SharedCheckboxProps<any>): Partial<SharedCheckboxState<T>> {
    const { checkedList, allOptions } = newProps;
    return {
      checkedList,
      indeterminate: !!checkedList.length && checkedList.length < allOptions.length,
      checkAll: checkedList.length === allOptions.length,
    };
  }

  onCheckAllChange({ target }: CheckboxChangeEvent): void {
    const { allOptions, onChecked, onUnchecked } = this.props;
    target.checked ? onChecked(allOptions) : onUnchecked(allOptions);
    this.setState({
      checkedList: target.checked ? allOptions : [],
      indeterminate: false,
      checkAll: target.checked,
    });
  }

  render(): React.ReactNode {
    return (
      <Checkbox
        indeterminate={this.state.indeterminate}
        onChange={this.onCheckAllChange}
        checked={this.state.checkAll}
        style={{ margin: "auto", width: 120 }}
      >
        {this.props.children}
      </Checkbox>
    );
  }
}
