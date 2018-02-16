const https = require('https');

function url(symbol) {
	return "https://api.iextrading.com/1.0/stock/" + symbol + "/batch?types=quote"
}

const holdings = require('fs')
	.readFileSync("holdings.txt", 'utf-8')
	.split('\n')
	.filter(Boolean)
	.map(l => l.split('\t'))
	.map(arr => ({
		symbol: arr[0],
		shares: arr[1]
	}))


const promises = holdings.map(h => new Promise((resolve, reject) => {
	https.get(url(h.symbol), (res) => {
		var rawData = "";

		res.on('data', (d) => {
			rawData += d
		});

		res.on('end', () => {
			var parsedData = JSON.parse(rawData);
			resolve(Object.assign({}, h, {
				previousClose: Number(parsedData.quote.previousClose),
				latestPrice: Number(parsedData.quote.latestPrice),
				changePercent: Number(parsedData.quote.changePercent)
			}))
		});
	}).on('error', (e) => {
		reject(e);
	});
}))

Promise.all(promises).then(hs => {
	const decorated = hs.map(h => Object.assign({}, h, {
		startValue: (h.previousClose * h.shares),
		currentValue: (h.latestPrice * h.shares)
	}))

	const total = decorated.reduce((agg, h) => {
		agg.startValue += h.startValue
		agg.currentValue += h.currentValue
		return agg;
	}, {
		startValue: 0,
		currentValue: 0
	})

	total.deltaValue = total.currentValue - total.startValue
	total.deltaPercent = total.deltaValue / total.startValue

	console.log(total.deltaValue + " (" + total.deltaPercent + ")")
})
