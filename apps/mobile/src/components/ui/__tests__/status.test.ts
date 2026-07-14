import { STATUS } from '../status'

describe('STATUS map', () => {
  it('maps overdue to the danger tone', () => {
    expect(STATUS.overdue.toneKey).toBe('danger')
  })

  it('gives every status an icon AND a label (never colour alone)', () => {
    for (const kind of Object.keys(STATUS) as (keyof typeof STATUS)[]) {
      expect(STATUS[kind].icon).toBeTruthy()
      expect(STATUS[kind].defaultLabel.length).toBeGreaterThan(0)
    }
  })
})
