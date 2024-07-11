import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

export function withRouter(Component) {
  return function ComponentWithRouterProp(props) {
    const navigate = useNavigate();
    const params = useParams();
    const location = useLocation();
    console.log("withRouter params:", params); // Debugging line
    console.log("withRouter location:", location); // Debugging line
    return <Component {...props} router={{ navigate, params, location }} />;
  }
}