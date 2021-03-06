const { writeFileSync, readFileSync } = require('fs')
const path = require('path')
const swPrecache = require('sw-precache')
const UglifyJS = require('uglify-es')

const DEFAULT_FILENAME = 'service-worker.js'
const DEFAULT_CACHE_FILE_TYPE = `js,css,png,jpg,gif,svg,ico,eot,ttf,woff,woff2`
const DEFAULT_IGNORE = [
    /\.map$/,
    /service-worker\.js$/,
    /sw\.js$/
]

let distDir = ''

const getServiceWorker = ({ outDir, customOptions = {}, rootDir }) => {
    const options = {
        fileName: DEFAULT_FILENAME,
        navigateFallback: '/index.html',
        staticFileGlobs: [
            `${distDir}/*.{${DEFAULT_CACHE_FILE_TYPE}}`,
            `${distDir}/index.html`
        ],
        staticFileGlobsIgnorePatterns: DEFAULT_IGNORE,
        stripPrefix: `${distDir}/`,
        minify: true
    }
    return swPrecache.generate(Object.assign({}, options, customOptions)).catch(err => {
        throw err
    })
}

module.exports = bundler => {
    const { rootDir, outDir } = bundler.options
    distDir = outDir.replace(rootDir, '').substr(1)

    bundler.on('bundled', (bundle) => {
        const customOptions = bundle.entryAsset.package.sw
        const serviceWorkerFilePath = path.resolve(outDir, customOptions.fileName)

        getServiceWorker({ outDir, customOptions, rootDir }).then(codes => {
            if (customOptions.minify) {
                const compressedCodes = {}
                compressedCodes[customOptions.fileName] = codes
                codes = UglifyJS.minify(compressedCodes).code
            }

            if (customOptions.swSrc) {
                codes += UglifyJS.minify(readFileSync(path.join(rootDir, customOptions.swSrc), 'utf8')).code
            }

            writeFileSync(serviceWorkerFilePath, codes)

            console.log(`😁 Service worker "${distDir}/${customOptions.fileName}" generated successfully.`)
        }).catch(err => {
            console.log(`🤯 Service worker generation failed: ${err}`)
        })
    })
}
