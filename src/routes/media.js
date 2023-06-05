/**
 * Test items:
 * - 200 (after upstream redirect to media):
 *   /2020702/raa_fmi_10036300590001
 * - 302 (after upstream redirect to web page):
 *   /2021012/app_si_A_II_841_3A98
 *   /2064108/Museu_ProvidedCHO_Vorderasiatisches_Museum__Staatliche_Museen_zu_Berlin_DE_MUS_815718_1981597
 * - 200 (image w/ application/octet-stream content-type):
 *   /2021803/C10002457770
 * - 403
 *   /794/ark__12148_bc6p070269f
 *   /199/item_FVWCYWMACYQ4W4GCM7QQNWQV3M6Y7DFY
 * - 404 (from API)
 *   /91622/raa_kmb_16000200017076
 * - 404 (from upstream)
 *   /761/_nh8fW8R
 *   /2022709/oai_fototeca_mcu_es_fototeca_WUNDERLICH_WUN_17964
 *   /08625/FILM00055500c_6
 *   /2022709/oai_fototeca_mcu_es_fototeca_LOTY_LOTY_10117/417317fb0211e24cf6db811e08e07823
 *   /2020718/Rijksmonumentnummer_513477
 * - 504
 *   /536/urn___mint_think_code_io_europeana_cyprus_E_0709
 *   /9200517/ark__12148_btv1b53098798q
 *   /2048005/Athena_Plus_ProvidedCHO_Nationalmuseum__Sweden_83982
 */

import md5 from 'md5'

import webResourceProxy from '../middlewares/web-resource-proxy.js'
import { requestDataSource } from '../sources/index.js'

const mediaRoute = async (req, res) => {
  let source
  try {
    source = requestDataSource(req)
  } catch (error) {
    if (error.message === 'Unauthorised API URL') {
      return res.sendStatus(403)
    } else {
      throw (error)
    }
  }

  const itemId = `/${req.params.datasetId}/${req.params.localId}`

  try {
    const webResource = await source.find(itemId, req.params.webResourceHash)

    if (!webResource) {
      // No isShownBy and no hash, or invalid hash
      return res.sendStatus(404)
    } else if (webResource.edmRights.includes('/InC/')) {
      // In copyright, proxying forbidden
      return res.sendStatus(403)
    } else if (!req.params.webResourceHash) {
      // Redirect to the URL with the hash, preserving the query
      let redirectPath = `/media/${req.params.datasetId}/${req.params.localId}/${md5(webResource.id)}`
      const query = new URLSearchParams(req.query).toString()
      if (query !== '') {
        redirectPath = `${redirectPath}?${query}`
      }
      return res.redirect(302, redirectPath)
    }

    // Try proxying it
    webResourceProxy(webResource.id)(req, res)
  } catch (error) {
    console.error(error.message)

    let errorStatus
    // TODO: log error message to APM?
    // let errorMessage
    if (error.response) {
      errorStatus = error.response.status
      // errorMessage = error.response.data.error
    }

    res.sendStatus(errorStatus || 502)
  }
}

export default async (req, res) => {
  try {
    await mediaRoute(req, res)
  } catch (error) {
    console.error(error.message)
    res.sendStatus(500)
  }
}
