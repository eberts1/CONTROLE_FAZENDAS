from pypdf import PdfReader
import sys

path = sys.argv[1]
pwd = sys.argv[2] if len(sys.argv) > 2 else ''
r = PdfReader(path)
if r.is_encrypted:
    r.decrypt(pwd)
print(''.join((p.extract_text() or '') for p in r.pages))
