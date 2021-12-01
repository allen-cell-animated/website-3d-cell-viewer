import React, { useState } from 'react';
import { Drawer, Button } from 'antd';

export function BottomPanel(props) {
    const [visible, setVisible] = useState(false);
    const showDrawer = () => {
        setVisible(true);
    };
    const onClose = () => {
        setVisible(false);
    };
    return (
        <div style={{ 
            position: 'absolute',
            bottom: 0,
            width: "100%"
        }}>
            <Button type="primary" onClick={showDrawer}>
                Open
            </Button>
            <Drawer 
                title="Basic Drawer"
                placement="bottom"
                onClose={onClose}
                visible={visible}
                getContainer={false}
                style={{ position: 'absolute' }}
            >
                <p>hi</p>
            </Drawer>
        </div>
    );
}
