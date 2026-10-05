BR = '<p><br /></p>'


def P(text):
    return f'<p>{text}</p>'


def H1(text):
    return f'{BR}<h1>{text}</h1>{BR}'


def H2(text):
    return f'<h2>{text}</h2>{BR}'


def H3(text):
    return f'<h3>{text}</h3>{BR}'


def _list(kind, items):
    lis = ''.join(f'<li data-list="{kind}"><span class="ql-ui"></span>{i}</li>' for i in items)
    return f'<ol>{lis}</ol>'


def UL(*items):
    return _list('bullet', items)


def OL(*items):
    return _list('ordered', items)


def html(*blocks):
    return ''.join(blocks)
