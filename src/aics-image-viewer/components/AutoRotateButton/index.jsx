import { Button } from 'antd';
import React from 'react';

import viewMode from '../../shared/enums/viewMode';
import { THREE_D_MODE } from '../../shared/constants';

import './styles.scss';

export default class AutoRotateButton extends React.Component {

    constructor(props) {
        super(props);
        this.handleAutorotateCheck = this.handleAutorotateCheck.bind(this);
    }

    handleAutorotateCheck(event, checked) {
        this.props.onAutorotateChange();
    }

    render() {
        const {
            autorotate,
            mode,
            disabled
        } = this.props;
        const buttonType = autorotate ? "pause-circle" : "play-circle";
        if (viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(mode) !== THREE_D_MODE) {
            return null;
        }
        return (
            <Button
                icon={buttonType}
                className="turn-table-button"
                onClick={this.handleAutorotateCheck}
                disabled={disabled}
            >
                Turntable
            </Button>
        );
    }

}

