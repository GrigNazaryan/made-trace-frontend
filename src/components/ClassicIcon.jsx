const paths = {
  download: "M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5",

  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  lock: "M5 10h14v11H5V10Zm3 0V7a4 4 0 0 1 8 0v3",
  enter: "M13 4h7v16h-7M3 12h12m-4-4 4 4-4 4",
  plus: "M5 12h14M12 5v14",
  search: "M15 15l5 5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  mail: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  card: "M3 5h18v14H3V5Zm0 5h18m-14 5h3",
  store: "M3 9l2-5h14l2 5M3 9v4h18V9H3Zm2 4v7h14v-7m-9 7v-5h4v5",

  home: "M3 11l9-8 9 8M5 10v11h5v-7h4v7h5V10",
  calendar: "M4 5h16v16H4V5Zm0 5h16M8 3v4m8-4v4M8 14h2m4 0h2m-8 4h2",
  users: "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M17 4a4 4 0 0 1 0 7m2 3a4 4 0 0 1 3 4v3",
  chart: "M4 3v18h17M8 16v-4m5 4V7m5 9v-6",
  pricing: "M20 4H11L3 12l9 9 8-8V4ZM15 8h1",
  box: "M3 7l9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10",
  check: "m5 12 4 4L19 6",
  review: "M9 3h6l1 3h3v15H5V6h3l1-3Zm0 9 2 2 4-4",
  gear: "m8 3-1 3-3 1v4l3 1 1 3h4l1-3 3-1V7l-3-1-1-3H8Zm2 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
  ready: "M5 4h14v17l-7-4-7 4V4Zm3 6 3 3 5-5",
  shirt: "m8 3-5 3 3 5 2-1v11h8V10l2 1 3-5-5-3c-1 3-7 3-8 0Z",
  upload: "M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
  track: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l4 2",
};

export default function ClassicIcon({ name }) {
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
