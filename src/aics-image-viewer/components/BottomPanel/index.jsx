import React, { useState } from 'react';
import { Drawer, Button, Icon } from 'antd';

import './styles.css';

export function BottomPanel(props) {
    const [visible, setVisible] = useState(false);
    const toggleDrawer = () => {
        setVisible(!visible);
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
            <Drawer 
                className="drawer"
                placement="bottom"
                closable={false}
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
