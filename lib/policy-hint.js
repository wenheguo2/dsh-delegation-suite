// dsh-delegation-suite / policy-hint — host-plane always-on prompt section.
// Registers a compact, cache-stable reminder of the delegation / review /
// adversary policy so every agent in every preset follows it.
const name = 'policy-hint'
const inject = ['systemPrompt']

const HINT =
  '委派与审核策略：' +
  '1) 独立任务包优先用 delegate_ranked 按 role 委派，自动选最强模型并在失败时切换；' +
  '2) 完成非平凡代码改动（累计>50行、涉及多文件、或触碰配置/schema/鉴权/数据库/核心逻辑/构建脚本）后，宣布完成前自动委派 review 子代理审核，blocker/major 修复后再简审；' +
  '3) 重要方案定稿前可让 adversary 角色挑刺；' +
  '4) 每次委派结束向用户汇报所用模型；' +
  '5) 模型透明性：delegate_ranked 自动带 [provider/model] 标签；用 subagent/subagent_fork 时，description 参数必须以 [当前会话模型] 开头，让子代理树一眼可见模型。'

function apply(ctx) {
  ctx.systemPrompt.section({
    name: 'delegation-policy-hint',
    order: 90,
    text: () => HINT,
  })
}

export { apply, inject, name }
