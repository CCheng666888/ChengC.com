from pathlib import Path

root = Path(__file__).resolve().parents[1]
file = root / 'about.html'
text = file.read_text(encoding='utf-8')
start = text.index('          <g class="staircase">')
end = text.index('          </g>', start) + len('          </g>')
parts = ['          <g class="staircase">']
# A single vanishing point; every tread widens towards the reader.
def edge(t):
    depth = t ** 1.6
    return (515 - 150 * depth, 548 + 280 * depth, 172 + 590 * depth)
for i in range(14):
    left, right, y = edge(i / 14)
    next_left, next_right, next_y = edge((i + 1) / 14)
    riser = 3 + 12 * ((i + 1) / 14) ** 1.4
    d = f'M{left:.1f} {y:.1f} {right:.1f} {y:.1f} {next_right:.1f} {next_y-riser:.1f} {next_left:.1f} {next_y-riser:.1f}Z'
    parts.append(f'            <path class="paper" d="{d}"/>')
    d = f'M{next_left:.1f} {next_y-riser:.1f} {next_right:.1f} {next_y-riser:.1f} {next_right:.1f} {next_y:.1f} {next_left:.1f} {next_y:.1f}Z'
    parts.append(f'            <path class="ink" d="{d}"/>')
parts.append('            <path class="ink" d="M507 172V70h48v102Z"/><path class="paper" d="M514 82h34v80h-34Z"/><path class="scarlet" d="M531 87h13v72h-13Z"/>')
parts.append('          </g>')
file.write_text(text[:start] + '\n'.join(parts) + text[end:], encoding='utf-8')
