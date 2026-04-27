import struct, zlib

def create_png(w, h, filepath):
    raw = b''
    for y in range(h):
        raw += b'\x00' + b'\x4b\x8b\xe8\xff' * w

    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw)
    with open(filepath, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', idat))
        f.write(chunk(b'IEND', b''))

for s in [16, 48, 128]:
    create_png(s, s, f'/mnt/c/Users/denny/Downloads/Hermes_Workspace/tv-chart-analyzer/extension/icons/icon{s}.png')
    print(f'Created icon{s}.png')
