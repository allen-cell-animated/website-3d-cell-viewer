import React from 'react';
import PropTypes from 'prop-types';
import muiThemeable from 'material-ui/styles/muiThemeable';
import {
  FlatButton, 
  Menu, 
  MenuItem,
  Popover
} from 'material-ui';

class DropdownMenu extends React.Component {

  constructor(props) {
    super(props);

    this.openMenu = this.openMenu.bind(this);
    this.closeMenu = this.closeMenu.bind(this);
    this.handleMenuItemClick = this.handleMenuItemClick.bind(this);

    this.state = {
        menuOpen: false,
        label: props.initialSelection > -1 ? props.labels[props.initialSelection] : (props.initialLabel || 'Menu'),
        selection: props.initialSelection > -1 ? props.initialSelection : -1
    };
  }

  openMenu(event) {
    // prevents "ghost click" that happens on touch-devices
    // http://www.material-ui.com/#/components/popover
    event.preventDefault();

    this.setState({
      menuOpen: true,
      anchorEl: event.currentTarget
    });
  }

  closeMenu() {
    this.setState({
      menuOpen: false
    });
  }

  handleMenuItemClick(i) {
    return () => {
      const names = this.props.labels;
      this.setState({
        label: names[i],
        selection: i
      });
      this.props.onMenuItemClick(i);
      this.closeMenu();
    };
  }

  render() {
    if (!this.props.labels || this.props.labels.length === 0) {
      return null;
    }

    const names = this.props.labels;
    const propStyle = this.props.style;
    return (
        <div style={{...{height: 30}, ...propStyle}}>
            <FlatButton label={this.state.label}
                        style={{minWidth: 0,
                            border: `2px solid ${this.props.muiTheme.palette.primary1Color}`,
                            borderRadius: 3
                        }}
                        labelStyle={{
                            color: this.props.muiTheme.palette.textColor, 
                            textTransform: 'none', 
                            fontSize: 16
                        }}
                        onClick={this.openMenu}/>
            <Popover open={this.state.menuOpen}
                anchorEl={this.state.anchorEl}
                anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
                targetOrigin={{horizontal: 'left', vertical: 'top'}}
                onRequestClose={this.closeMenu}>
                <Menu style={{maxHeight: 300}} >
                    {names.map((name, i) =>
                    (<MenuItem secondaryText={`${i}`}
                        primaryText={name}
                        onClick={this.handleMenuItemClick(i)}
                        key={i}
                        style={{color:this.props.muiTheme.palette.textColor}}/>)
                    )
                    }
                </Menu>
            </Popover>
        </div>
    );
  }
}

DropdownMenu.propTypes = {
    labels: PropTypes.arrayOf(PropTypes.string),
    initialSelection: PropTypes.number,
    initialLabel: PropTypes.string,
    style: PropTypes.object
};

export default muiThemeable()(DropdownMenu);
