const fieldLabelMap: Record<string, string> = {
  page: '页码',
  pageSize: '每页数量',
  keyword: '关键词',
  status: '状态',
  title: '标题',
  slug: 'Slug',
  summary: '摘要',
  cover: '封面图',
  markdownContent: '正文内容',
  categoryIds: '分类',
  tagIds: '标签',
  username: '用户名',
  password: '密码',
  refreshToken: '刷新令牌',
  content: '内容',
  repoUrl: '仓库地址',
  previewUrl: '预览地址',
  sortOrder: '排序值',
  siteName: '站点名称',
  siteDescription: '站点描述',
  siteUrl: '站点地址',
  seoTitle: 'SEO 标题',
  seoDescription: 'SEO 描述',
  contactEmail: '联系邮箱',
};

const getFieldLabel = (field: string) => fieldLabelMap[field] ?? field;

const translators: Array<{
  test: RegExp;
  resolve: (matches: RegExpExecArray) => string;
}> = [
  { test: /^missing bearer token$/i, resolve: () => '登录状态已失效，请重新登录。' },
  { test: /^invalid or expired access token$/i, resolve: () => '登录状态已过期，请重新登录。' },
  { test: /^post not found$/i, resolve: () => '文章不存在或已被删除。' },
  { test: /^project not found$/i, resolve: () => '项目不存在或已被删除。' },
  { test: /^category not found$/i, resolve: () => '分类不存在或已被删除。' },
  { test: /^tag not found$/i, resolve: () => '标签不存在或已被删除。' },
  { test: /^page not found$/i, resolve: () => '页面不存在。' },
  { test: /^user not found$/i, resolve: () => '用户不存在。' },
  { test: /^post slug already exists$/i, resolve: () => '文章 Slug 已存在，请更换后重试。' },
  { test: /^project slug already exists$/i, resolve: () => '项目 Slug 已存在，请更换后重试。' },
  { test: /^category slug already exists$/i, resolve: () => '分类 Slug 已存在，请更换后重试。' },
  { test: /^tag slug already exists$/i, resolve: () => '标签 Slug 已存在，请更换后重试。' },
  {
    test: /^(.+) must be an integer number$/i,
    resolve: (matches) => `${getFieldLabel(matches[1])}必须是整数。`,
  },
  {
    test: /^(.+) must not be less than (\d+)$/i,
    resolve: (matches) => `${getFieldLabel(matches[1])}不能小于 ${matches[2]}。`,
  },
  {
    test: /^(.+) must not be greater than (\d+)$/i,
    resolve: (matches) => `${getFieldLabel(matches[1])}不能大于 ${matches[2]}。`,
  },
  {
    test: /^(.+) must be longer than or equal to (\d+) characters$/i,
    resolve: (matches) => `${getFieldLabel(matches[1])}长度不能少于 ${matches[2]} 个字符。`,
  },
  {
    test: /^(.+) must be shorter than or equal to (\d+) characters$/i,
    resolve: (matches) => `${getFieldLabel(matches[1])}长度不能超过 ${matches[2]} 个字符。`,
  },
  {
    test: /^(.+) must be a string$/i,
    resolve: (matches) => `${getFieldLabel(matches[1])}必须是字符串。`,
  },
  {
    test: /^each value in (.+) must be a string$/i,
    resolve: (matches) => `${getFieldLabel(matches[1])}中的每一项都必须是字符串。`,
  },
  {
    test: /^(.+) must be an array$/i,
    resolve: (matches) => `${getFieldLabel(matches[1])}必须是数组。`,
  },
  {
    test: /^(.+) should not be empty$/i,
    resolve: (matches) => `${getFieldLabel(matches[1])}不能为空。`,
  },
  {
    test: /^(.+) must be one of the following values:/i,
    resolve: (matches) => `${getFieldLabel(matches[1])}的取值不合法。`,
  },
];

export const getFallbackErrorMessage = (status: number) => {
  switch (status) {
    case 400:
      return '请求参数有误，请检查后重试。';
    case 401:
      return '登录状态已失效，请重新登录。';
    case 403:
      return '你暂无权限执行此操作。';
    case 404:
      return '请求的资源不存在。';
    case 409:
      return '数据发生冲突，请检查后重试。';
    default:
      return status >= 500
        ? '服务器暂时不可用，请稍后再试。'
        : '请求失败，请稍后重试。';
  }
};

export const localizeErrorMessage = (message: string, status: number) => {
  const normalized = message.trim();

  if (!normalized || normalized === 'Internal server error') {
    return getFallbackErrorMessage(status);
  }

  for (const translator of translators) {
    const matches = translator.test.exec(normalized);

    if (matches) {
      return translator.resolve(matches);
    }
  }

  return normalized;
};
