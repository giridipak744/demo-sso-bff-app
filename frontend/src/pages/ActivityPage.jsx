import './ActivityPage.css';

export default function ActivityPage() {
  return (
    <div className="activity-page">
      <div className="activity-header">
        <h1 className="page-title">Activity Log</h1>
        <p className="activity-subtitle">
          View all account security and authentication events.
        </p>
      </div>

      <div className="card activity-filters">
        <div className="filter-group">
          <label>Search</label>
          <input type="text" placeholder="Search events or application" />
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select>
            <option>All status</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Event type</label>
          <select>
            <option>All event types</option>
          </select>
        </div>
        <div className="filter-group date-group">
          <label>From</label>
          <input type="date" />
        </div>
        <div className="filter-group date-group">
          <label>To</label>
          <input type="date" />
        </div>
        <div className="filter-actions">
          <button className="btn-outline">Refresh</button>
          <button className="btn-primary">Export</button>
        </div>
      </div>

      <div className="card activity-table-container">
        <div className="table-header">
          <span>Showing 1–15 of 100 events</span>
        </div>
        <table className="activity-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Event</th>
              <th>Status</th>
              <th>Application / IP</th>
            </tr>
          </thead>
          <tbody>
            {/* Placeholder rows */}
            <tr>
              <td>June 29, 2026 at 4:13 PM</td>
              <td>
                <div className="event-name">Login</div>
                <div className="event-type">LOGIN</div>
              </td>
              <td><span className="badge badge-success">Success</span></td>
              <td>account-console / 202.166.198.213</td>
            </tr>
            <tr>
              <td>June 29, 2026 at 4:10 PM</td>
              <td>
                <div className="event-name">Login</div>
                <div className="event-type">LOGIN</div>
              </td>
              <td><span className="badge badge-success">Success</span></td>
              <td>demo-confidential-client / 202.166.198.213</td>
            </tr>
            <tr>
              <td>June 29, 2026 at 4:09 PM</td>
              <td>
                <div className="event-name">Login</div>
                <div className="event-type">LOGIN</div>
              </td>
              <td><span className="badge badge-success">Success</span></td>
              <td>demo-confidential-client / 202.166.198.213</td>
            </tr>
          </tbody>
        </table>
        <div className="table-footer">
          <div className="rows-per-page">
            Rows per page: <select><option>15</option></select>
          </div>
          <div className="pagination">
            <button className="page-btn active">1</button>
            <button className="page-btn">2</button>
          </div>
        </div>
      </div>
      
      <div className="alert alert-warning mt-4">
        <strong>Developer Note:</strong> This page requires the custom <code>user-events-api</code> Keycloak extension to be installed on your server.
      </div>
    </div>
  );
}
