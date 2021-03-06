'use strict';

var React = require('react'),
    Router = require('react-router'),
    RouteHandler = Router.RouteHandler,
    Header = require('./components/header'),
    Footer = require('./components/footer');


module.exports = React.createClass({
  render: function() {
    return (
      <div>
        <Header ref="header" />
        <div className='container'>
          <RouteHandler />
        </div>
        <Footer ref="footer" />
      </div>
    );
  }
});
