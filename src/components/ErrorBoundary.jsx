import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="panel-card error-boundary-card" role="alert">
          <h3 className="panel-card-title">Panel Error</h3>
          <div className="panel-card-body">
            <p className="prose-text">Something went wrong in this panel. Try re-analyzing.</p>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
