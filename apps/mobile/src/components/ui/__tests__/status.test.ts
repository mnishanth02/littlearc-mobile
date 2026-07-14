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

  it('maps every kind to the right tone', () => {
    expect(STATUS.success.toneKey).toBe('success')
    expect(STATUS.dueSoon.toneKey).toBe('warning')
    expect(STATUS.overdue.toneKey).toBe('danger')
    expect(STATUS.info.toneKey).toBe('info')
  })
})
