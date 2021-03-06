import { parse } from 'url';
import Axios from 'axios';
const protocolAndDomainRE = /^(?:\w+:)?\/\/(\S+)$/;

const localhostDomainRE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
const nonLocalhostDomainRE = /^[^\s\.]+\.\S{2,}$/;
export const isUrl = (string: string) => {
    if (typeof string !== 'string') {
        return false;
    }

    const match = string.match(protocolAndDomainRE);
    if (!match) {
        return false;
    }

    const everythingAfterProtocol = match[1];
    if (!everythingAfterProtocol) {
        return false;
    }

    if (localhostDomainRE.test(everythingAfterProtocol) || nonLocalhostDomainRE.test(everythingAfterProtocol)) {
        return true;
    }

    return false;
};
export const isImage = async (url: string): Promise<string | undefined> => {
    if (!url) return;
    const http = url.lastIndexOf('http');
    if (http != -1) url = url.substring(http);
    if (!isUrl(url)) return;
    let pathname = parse(url).pathname;
    if (!pathname) return;
    const last = pathname.search(/[:?&]/);
    if (last != -1) pathname = pathname.substring(0, last);
    if (/styles/i.test(pathname)) return;
    const res = await Axios({
        method: 'GET',
        url: url
    });
    if (!res) return;
    const headers = res.headers;
    if (!headers) return;
    const contentType = headers['content-type'];
    if (!contentType) return;
    return contentType.search(/^image\//) != -1 ? url : undefined;
};
