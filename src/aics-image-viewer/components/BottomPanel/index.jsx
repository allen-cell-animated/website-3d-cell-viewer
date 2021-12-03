import React, { useState } from 'react';
import { Drawer, Button, Icon } from 'antd';

import './styles.css';

export function BottomPanel(props) {
    const [visible, setVisible] = useState(false);
    const toggleDrawer = () => {
        setVisible(!visible);
    };
    const onClose = () => {
        setVisible(false);
    };

    const closeButton = <Button
        className="options-button close-button"
        size="small"
        onClick={toggleDrawer}
    >
        Options
        <Icon type="double-right" className="button-arrow" />
    </Button>;

    return (
        <div className="container">
            <Button 
                className="options-button open-button"
                size="small"
                onClick={toggleDrawer}
            >
                Options
                <Icon type="double-left" className="button-arrow"/>
            </Button>
            <Drawer 
                className="drawer"
                placement="bottom"
                closable={false}
                onClose={onClose}
                getContainer={false}
                visible={visible}
                mask={false}
                title={closeButton}
            >
                <p>test</p>
            </Drawer>
        </div>
    );
}
