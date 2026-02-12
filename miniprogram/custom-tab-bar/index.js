Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        icon: "🏠",
      },
      {
        pagePath: "/pages/records/records",
        text: "记录",
        icon: "📋",
      },
      {
        pagePath: "/pages/add/add",
        text: "添加",
        icon: "➕",
        isAdd: true,
      },
      {
        pagePath: "/pages/reminders/reminders",
        text: "提醒",
        icon: "🔔",
      },
      {
        pagePath: "/pages/profile/profile",
        text: "我的",
        icon: "👤",
      },
    ],
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      wx.switchTab({ url });
    },
  },
});
